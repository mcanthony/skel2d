(function(scope) {

scope.skel2d_parse = parse;

var StateNone     = 0;
var StateSkeleton = 1;
var StateSkin     = 2;
var StateOrder    = 3;
var StateAnim     = 4;

var cmd = {
	set_frame:      0,
	set_step:       1,
	set_easing:     2,
	advance_steps:  3,
	advance_frames: 4,
	push_value:     5,
	push_value_inc: 6,
	push_value_mul: 7,
	begin_loop:     8,
	end_loop:       9
};

var easing_map = [
	"li", "lerp",
	"si", "sin_in",
	"so", "sin_out",
	"sio", "sin_in_out"
];

var prop_map = {
	"x": "x",
	"y": "y",
	"i": "sx",
	"j": "sy",
	"r": "rot"
};

function parse(source)
{
	var state = StateNone;
	var lines = source.split("\n");
	var nlines = lines.length;

	var skeleton = {};
	var bones = [];
	var slots = [];
	var attachments = [];
	var animations = [];
	var draw_order = [];

	var current_bone = null;
	var current_attachment = null;
	var current_animation = null;
	var current_animation_item = null;

	for (var i = 0; i < nlines; i++)
	{
		var line = lines[i];
		var len = line.length;
		var prev_line = i - 1;

		if (/^\s*$/.test(line))
			continue;

		if (line.charAt(len - 1) === "\r")
			line = line.substr(0, --len);

		while (line.charAt(len - 1) === "\\" && i + 1 < nlines)
		{
			line = line.substr(0, len - 1) + " " + lines[++i];
			len = line.length;

			if (line.charAt(len - 1) === "\r")
				line = line.substr(0, --len);
		}

		switch (state)
		{
			case StateNone:
			{
				if (/^skeleton(\s|$)/.test(line))
				{
					var tokens = line.match(/\S+/g);

					for (var j = 1, n = tokens.length; j < n; j++)
					{
						var tok = tokens[j];

						if (/^#([\da-fA-F]{3}|[\da-fA-F]{6})(,\d+(\.\d+)?)?$/.test(tok))
							skeleton.color = parse_color(tok);
					}

					state = StateSkeleton;
				}
				else if (/^skin(\s|$)/.test(line))
				{
				}
				else if (/^order(\s|$)/.test(line))
				{
					state = StateOrder;
				}
				else if (/^anim(\s|$)/.test(line))
				{
					var tokens = line.match(/\S+/g);
					current_animation = parse_animation(tokens);
					animations.push(current_animation);
					state = StateAnim;
				}
			}
			break;

			case StateSkeleton:
			{
				if (/^[^\t]/.test(line))
				{
					// end of skeleton

					state = StateNone;
					i = prev_line;

					current_bone = null;
					current_attachment = null;
				}
				else if (/^\t[a-zA-Z_\-][\w\-]*(\.[a-zA-Z_\-][\w\-]*)*($|\s)/.test(line))
				{
					// bone

					var tokens = line.match(/\S+/g);

					current_bone = parse_bone(bones, tokens);
					current_attachment = null;

					if (current_bone !== null)
						bones.push(current_bone);
				}
				else if (/^\t\t@([a-zA-Z_\-][\w\-]*)?(\[[a-zA-Z_\-][\w\-]*\])?($|\s)/.test(line))
				{
					// slot/attachment

					if (current_bone !== null)
					{
						var tokens = line.match(/\S+/g);
						var slot = parse_slot(slots, current_bone, tokens);
						var attachment = parse_attachment(attachments, current_bone, tokens);

						if (slot !== null)
							slots.push(slot);

						if (attachment !== null)
						{
							attachments.push(attachment);

							if (attachment.type === "path")
							{
								current_attachment = attachment;
								current_attachment.commands = [];
							}
						}

					}
				}
				else if (/^\t\t\t((M|Q|:|B|L)\s+|C($|\s+))/.test(line))
				{
					// path command

					if (current_attachment !== null && current_attachment.type === "path")
					{
						var tokens = line.match(/\S+/g);
						var command = parse_path_command(tokens);

						if (command !== null)
							Array.prototype.push.apply(current_attachment.commands, command);
					}
				}
				else if (/^\t[^\t]/.test(line))
				{
					current_bone = null;
					current_attachment = null;
				}
				else if (/^\t\t[^\t]/.test(line))
				{
					current_attachment = null;
				}
			}
			break;

			case StateAnim:
			{
				if (/^[^\t]/.test(line))
				{
					// end of animation

					state = StateNone;
					i = prev_line;

					current_animation = null;
					current_animation_item = null;
				}
				else if (/^\t@?[a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*(?:$|\s)/.test(line))
				{
					// bone/slot

					var tokens = line.match(/\S+/g);

					current_animation_item = parse_animation_item(tokens);
					current_animation.items.push(current_animation_item);
				}
				else if (/^\t\t.\s/.test(line))
				{
					// timeline

					if (current_animation_item !== null)
					{
						var tokens = line.match(/\S+/g);
						var timeline = parse_timeline(current_animation_item, tokens);

						if (timeline !== null)
							current_animation_item.timelines.push(timeline);
					}
				}
				else if (/^\t[^\t]/.test(line))
				{
					current_animation_item = null;
				}
			}
			break;

			case StateOrder:
			{
				if (/^[^\t]/.test(line))
				{
					// end of order

					state = StateNone;
					i = prev_line;
				}
				else if (/^\t@[a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*(?:$|\s)/.test(line))
				{
					var end = line.indexOf(" ");

					if (end !== -1)
						draw_order.push(line.substring(2, end));
					else
						draw_order.push(line.substring(2));
				}
			}
			break;
		}
	}

	var nbones = bones.length;

	// add missing parent bones

	var parent_bones = [];

	for (var i = 0; i < nbones; i++)
	{
		var name = bones[i].name;
		var index = -1;

		next: while (-1 !== (index = name.indexOf(".", index + 1)))
		{
			var parent_name = name.substring(0, index);

			for (var j = 0; j < nbones; j++)
				if (bones[j].name === parent_name)
					continue next;

			parent_bones.push({name: parent_name});
		}
	}

	for (var i = 0, n = parent_bones.length; i < n; i++)
	{
		bones.push(parent_bones[i]);
		nbones++;
	}

	// set default bone color

	if ("color" in skeleton)
	{
		for (var i = 0; i < nbones; i++)
		{
			if (!("color" in bones[i]))
				bones[i].color = skeleton.color;
		}
	}

	// process path attachments commands

	var nattachments = attachments.length;

	for (var i = 0; i < nattachments; i++)
	{
		var attachment = attachments[i];

		if (attachment.type === "path")
		{
			var src_commands = attachment.commands;
			var dst_commands = attachment.commands = [];

			var name = attachment.name;
			var def = name.substring(0, name.lastIndexOf(".", name.lastIndexOf(".") - 1));

			for (var j = 0, n = src_commands.length; j < n; j++)
			{
				var cmd = src_commands[j];

				if (cmd === ":")
				{
					def = find_name(bones, src_commands[++j], def);
				}
				else
				{
					var count = 0;

					switch (cmd)
					{
						case "C": count = 0; break;
						case "M": count = 1; break;
						case "L": count = 1; break;
						case "Q": count = 2; break;
						case "B": count = 3; break;
					}

					dst_commands.push(cmd);

					for (var k = 0; k < count; k++)
					{
						var x = src_commands[++j];
						var y = src_commands[++j];
						var b = src_commands[++j];

						dst_commands.push(isNaN(x) ? 0 : x);
						dst_commands.push(isNaN(y) ? 0 : y);
						dst_commands.push(b ? find_name(bones, b, def) : def);
					}
				}
			}
		}
	}

	// set default attachment of each slot

	var nslots = slots.length;

	for (var i = 0; i < nslots; i++)
	{
		var sname = slots[i].name;
		var slen = sname.length;

		for (var j = 0; j < nattachments; j++)
		{
			var aname = attachments[j].name;
			var alen = aname.length;

			if (alen > slen && aname.charAt(slen) === "." && aname.lastIndexOf(sname, 0) === 0 &&
				aname.indexOf(".", slen + 1) === -1)
			{
				slots[i].attachment = aname.substr(slen + 1);
				break;
			}
		}
	}

	// process draw order

	draw_order = draw_order.map(function(x) { return find_name(slots, x, null); });
	draw_order = draw_order.filter(function(x) { return x !== null; });

	var n = draw_order.length;

	for (var i = 0; i < nslots; i++)
	{
		var index = draw_order.indexOf(slots[i].name);

		if (index === -1)
			index = n + i;

		slots[i].index = index;
	}

	slots.sort(function(a, b) { return a.index - b.index; });

	for (var i = 0; i < nslots; i++)
		delete slots[i].index;

	// process animations

	for (var i = 0, n = animations.length; i < n; i++)
		animations[i] = process_animation(animations[i], bones, slots);

	return {
		"skeleton": {
			"bones": bones,
			"slots": slots,
			"skins": {
				"default": attachments
			}
		},
		"animations": animations
	};
}

function find_name(list, name, def)
{
	var result = def;
	var macthes = 0;
	var len = name.length;

	for (var i = 0, n = list.length; i < n; i++)
	{
		var item_name = list[i].name;
		var full_name = "skeleton." + item_name;

		if (full_name.indexOf(name, full_name.length - len) !== -1)
		{
			macthes++;
			result = item_name;
		}
	}

	return macthes > 1 ? def : result;
}

function parse_bone(bones, tokens)
{
	var name = tokens[0];

	if (/(?:^|\.)skeleton(?:$|\.)/.test(name))
		return null;

	for (var i = 0, n = bones.length; i < n; i++)
	{
		if (bones[i].name === name)
			return null;
	}

	var bone = { name: name };

	for (var i = 1, n = tokens.length; i < n; i++)
	{
		var tok = tokens[i];

		switch (tok)
		{
			case "no-rot":   bone.inhrot   = false; break;
			case "no-scale": bone.inhscale = false; break;
			case "flip-x":   bone.flipx    = true;  break;
			case "flip-y":   bone.flipy    = true;  break;

			default:
			{
				if (/^[xyrijl]-?\d+($|\.\d+$)/.test(tok))
				{
					var value = parseFloat(tok.substr(1));

					if (!isNaN(value))
					{
						var first = tok.charAt(0);

						switch (first)
						{
							case 'x': bone.x      = value; break;
							case 'y': bone.y      = value; break;
							case 'r': bone.rot    = value; break;
							case 'i': bone.sx     = value; break;
							case 'j': bone.sy     = value; break;
							case 'l': bone.length = value; break;
						}
					}
				}
				else if (/^#([\da-fA-F]{3}|[\da-fA-F]{6})(,\d+(\.\d+)?)?$/.test(tok))
					bone.color = parse_color(tok);
			}
			break;
		}
	}

	return bone;
}

function parse_slot(slots, bone, tokens)
{
	var name = tokens[0];

	if (name.charAt(name.length - 1) === "]")
		name = name.substr(0, name.indexOf("["));

	if (name === "@skeleton")
		return null;

	if (name === "@")
		name = "@" + bone.name.split(".").pop();

	name = bone.name + "." + name.substr(1);

	var slot = null;

	for (var i = 0, n = slots.length; i < n; i++)
	{
		if (slots[i].name === name)
		{
			slot = slots[i];
			break;
		}
	}

	var result = null;

	if (slot === null)
		slot = result = {name: name};

	for (var i = 1, n = tokens.length; i < n; i++)
	{
		var tok = tokens[i];

		if (tok.charAt(0) === ":")
			break;

		if (/^#([\da-fA-F]{3}|[\da-fA-F]{6})(,\d+(\.\d+)?)?$/.test(tok))
			slot.color = parse_color(tok);
	}

	return result;
}

function parse_attachment(attachments, bone, tokens)
{
	var name = tokens[0];
	var i = name.indexOf("[");

	var slot_name;
	var atth_name;

	if (i >= 0)
	{
		slot_name = name.substring(1, i);
		atth_name = name.substring(i + 1, name.length - 1);
	}
	else
	{
		slot_name = name.substr(1);
		atth_name = slot_name;
	}

	if (slot_name === "skeleton" || atth_name === "skeleton")
		return null;

	if (slot_name.length === 0)
		slot_name = bone.name.split(".").pop();

	if (atth_name.length === 0)
		atth_name = slot_name;

	name = bone.name + "." + slot_name + "." + atth_name;

	for (var i = 0, n = attachments.length; i < n; i++)
	{
		if (attachments[i].name === name)
			return null;
	}

	var attachment = {name: name, type: "none"};
	var ntokens = tokens.length;
	var start = -1;

	for (var i = 1; i < ntokens; i++)
	{
		if (tokens[i].charAt(0) === ":")
		{
			start = i + 1;
			attachment.type = tokens[i].substr(1);
			break;
		}
	}

	if (start < 0 || start === ntokens)
		return attachment;

	var is_sprite = attachment.type === "sprite";
	var is_rect = attachment.type === "rect";
	var is_circle = attachment.type === "circle";
	var is_ellipse = attachment.type === "ellipse";
	var is_path = attachment.type === "path";
	var is_shape = is_rect || is_circle || is_ellipse || is_path;

	for (var i = start; i < ntokens; i++)
	{
		var tok = tokens[i];
		var ch = tok.charAt(0);

		if (ch === '"')
		{
			if (is_sprite && tok.charAt(tok.length - 1) === '"')
				attachment.image = tok.substring(1, tok.length - 1);
		}
		else if (/^[wh]-?\d+(\.\d+)?$/.test(tok))
		{
			if (is_rect || is_ellipse)
			{
				var value = parseFloat(tok.substr(1));

				if (!isNaN(value))
				{
					var is_width = ch === "w";

					if (is_ellipse)
					{
						value /= 2;

						if (is_width)
							attachment.rx = value;
						else
							attachment.ry = value;
					}
					else
					{
						if (is_width)
							attachment.width = value;
						else
							attachment.height = value;
					}
				}
			}
		}
		else if (/^[xyrij]-?\d+(\.\d+)?$/.test(tok))
		{
			var value = parseFloat(tok.substr(1));

			if (!isNaN(value))
			{
				switch (ch)
				{
					case 'x': attachment.x   = value; break;
					case 'y': attachment.y   = value; break;
					case 'r': attachment.rot = value; break;
					case 'i': attachment.sx  = value; break;
					case 'j': attachment.sy  = value; break;
				}
			}
		}
		else if (is_shape)
		{
			if (/^(miter|bevel|round)-join$/.test(tok))
			{
				attachment.line_join = tok.split("-")[0];
			}
			else if (/^(square|butt|round)-cap$/.test(tok))
			{
				attachment.line_cap = tok.split("-")[0];
			}
			else if (/^[fs]#([\da-fA-F]{3}|[\da-fA-F]{6})(,\d+(\.\d+)?)?$/.test(tok))
			{
				if (ch === "f")
					attachment.fill_color = parse_color(tok.substr(1));
				else
					attachment.line_color = parse_color(tok.substr(1));
			}
			else if (/^[tm]\d+(\.\d+)?$/.test(tok))
			{
				var value = parseFloat(tok.substr(1));

				if (!isNaN(value))
				{
					if (ch === "t")
						attachment.line_width = parseFloat(value);
					else
						attachment.miter_limit = parseFloat(value);
				}
			}
			else if ((is_circle || is_rect) && /^d\d+(\.\d+)?$/.test(tok))
			{
				var value = parseFloat(tok.substr(1)) / 2;

				if (!isNaN(value))
				{
					if (is_circle)
						attachment.radius = value;
					else
						attachment.border_radius = value;
				}
			}
		}
	}

	return attachment;
}

function parse_path_command(tokens)
{
	var ch = tokens[0].charAt(0);
	var re = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?::([a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*))?$/;

	var m1 = null;
	var m2 = null;
	var m3 = null;

	var tk = tokens;
	var n = tk.length;

	switch (ch)
	{
		case "M":
		case "L":
			if (n >= 2 && (m1 = tk[1].match(re)))
				return [ch,
					m1[1], m1[2], m1[3] || null
				];
			break;

		case "Q":
			if (n >= 3 && (m1 = tk[1].match(re)) && (m2 = tk[2].match(re)))
				return [ch,
					m1[1], m1[2], m1[3] || null,
					m2[1], m2[2], m2[3] || null
				];
			break;

		case "B":
			if (n >= 3 && (m1 = tk[1].match(re)) && (m2 = tk[2].match(re)) && (m3 = tk[3].match(re)))
				return [ch,
					m1[1], m1[2], m1[3] || null,
					m2[1], m2[2], m2[3] || null,
					m3[1], m3[2], m3[3] || null
				];
			break;

		case "C":
			return [ch];

		case ":":
			if (n >= 2 && /^[a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*$/.test(tk[1]))
				return [ch, tk[1]];
	}

	return null;
}

function parse_color(str)
{
	var tokens = str.split(",");
	var result = tokens[0].substr(1);

	if (result.length === 3)
	{
		var r = result.charAt(0);
		var g = result.charAt(1);
		var b = result.charAt(2);

		result = r + r + g + g + b + b;
	}

	var alpha = tokens.length === 2 ? parseFloat(tokens[1]) : 1;
	alpha = Math.min(255 * (isNaN(alpha) ? 1 : alpha), 255)|0;

	result += alpha < 16 ? "0" + alpha.toString(16) : alpha.toString(16);

	return result.toLowerCase();
}

function parse_color_val(str)
{
	var color = [0, 0, 0, 1];
	var tokens = str.substr(1).split(",");
	var r, g, b;

	if (tokens[0].length === 3)
	{
		r = tokens[0].charAt(0); r += r;
		g = tokens[0].charAt(1); g += g;
		b = tokens[0].charAt(2); b += b;
	}
	else
	{
		r = tokens[0].substr(0, 2);
		g = tokens[0].substr(2, 2);
		b = tokens[0].substr(4, 2);
	}

	color[0] = parseInt(r, 16) / 255;
	color[1] = parseInt(g, 16) / 255;
	color[2] = parseInt(b, 16) / 255;

	if (tokens.length === 2)
	{
		var alpha = parseFloat(tokens[1]);

		if (!isNaN(alpha))
			color[3] = alpha;
	}

	return color;
}

function parse_animation(tokens)
{
	var animation = {};
	var ntokens = tokens.length;
	var res = null;
	var val = 0;

	for (var i = 1; i < ntokens; i++)
	{
		var tok = tokens[i];

		if (tok.charAt(0) === '"')
		{
			if (tok.charAt(tok.length - 1) === '"')
				animation.name = tok.substring(1, tok.length - 1);
		}
		else if (/^\d+fps$/.test(tok))
		{
			animation.fps = parseInt(tok, 10);
		}
		else if (res = match_animation_options(tok, false))
		{
			res[0] !== null && (animation.frame  = res[0]);
			res[1] !== null && (animation.step   = res[1]);
			res[2] !== null && (animation.easing = res[2]);
		}
	}

	animation.items = [];

	return animation;
}

function parse_animation_item(tokens)
{
	var item = {name: tokens[0]};
	var ntokens = tokens.length;
	var res = null;

	for (var i = 1; i < ntokens; i++)
	{
		if (res = match_animation_options(tokens[i], false))
		{
			res[0] !== null && (item.frame  = res[0]);
			res[1] !== null && (item.step   = res[1]);
			res[2] !== null && (item.easing = res[2]);
		}
	}

	item.timelines = [];

	return item;
}

function parse_timeline(item, tokens)
{
	var prop = tokens[0];
	var is_slot = item.name.charAt(0) === "@";

	if (is_slot && "@crgba".indexOf(prop) === -1)
		return null;

	if (!is_slot && "xyrij".indexOf(prop) === -1)
		return null;

	var timeline = {property: prop, commands: []};
	var commands = timeline.commands;
	var ntokens = tokens.length;
	var x, res = null;

	var re_value = null;

	if (prop === "c")
		re_value = /^#([\da-fA-F]{3}|[\da-fA-F]{6})(,\d+(\.\d+)?)?$/;
	else if (prop === "@")
		re_value = /^[a-zA-Z_\-][\w\-]*$/;
	else
		re_value = /^[+*]?-?\d+(?:\.\d+)?$/;

	for (var i = 1; i < ntokens; i++)
	{
		var tok = tokens[i];

		if (tok === "{")
		{
			commands.push(cmd.begin_loop);
		}
		else if (/^\}(?:\[\d+\])?$/.test(tok))
		{
			commands.push(cmd.end_loop, isNaN(x = parseInt(tok.substr(2), 10)) ? 1 : x);
		}
		else if (/^-*>$/.test(tok))
		{
			(x = tok.length - 1) > 0 && commands.push(cmd.advance_steps, x);
		}
		else if (re_value.test(tok))
		{
			var ch = tok.charAt(0);

			if (prop === "c")
				commands.push(cmd.push_value, parse_color_val(tok));
			else if (prop === "@")
				commands.push(cmd.push_value, tok);
			else if (ch === "+")
				!isNaN(x = parseFloat(tok.substr(1))) && commands.push(cmd.push_value_inc, x);
			else if (ch === "*")
				!isNaN(x = parseFloat(tok.substr(1))) && commands.push(cmd.push_value_mul, x);
			else
				!isNaN(x = parseFloat(tok)) && commands.push(cmd.push_value, x);
		}
		else if (res = match_animation_options(tok, true))
		{
			res[0] !== null && !res[4] && commands.push(cmd.set_frame, res[0]);
			res[0] !== null && res[4] && commands.push(cmd.advance_frames, res[0]);
			res[1] !== null && commands.push(cmd.set_step, res[1]);
			res[2] !== null && commands.push(cmd.set_easing, res[2]);
			res[3] > 0 && commands.push(cmd.advance_steps, res[3]);
		}
	}

	return commands.length > 0 ? timeline : null;
}

match_animation_options.re = [
	[
		/^(\d+(?:\.\d+)?)?:(\d+(?:\.\d+)?)?:([a-zA-Z_](?:[\w\-]*[a-zA-Z_])?)?$/,
		/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)?()?$/,
		/^()?(\d+(?:\.\d+)?)?:([a-zA-Z_](?:[\w\-]*[a-zA-Z_])?)$/
	],
	[
		/^(\+?\d+(?:\.\d+)?)?:(\d+(?:\.\d+)?)?:([a-zA-Z_](?:[\w\-]*[a-zA-Z_])?)?(-*)>$/,
		/^(\+?\d+(?:\.\d+)?):(\d+(?:\.\d+)?)?()?(-*)>$/,
		/^()?(\d+(?:\.\d+)?)?:([a-zA-Z_](?:[\w\-]*[a-zA-Z_])?)(-*)>$/
	]
];

function match_animation_options(str, in_timeline)
{
	var x, res = null;
	var re = match_animation_options.re[in_timeline ? 1 : 0];

	if ((res = re[0].exec(str)) || (res = re[1].exec(str)) || (res = re[2].exec(str)))
	{
		res.shift();

		if (in_timeline)
			res.push(res[0] !== undefined && res[0].charAt(0) === "+");

		res[0] !== undefined && !isNaN(x = parseFloat(res[0])) && ((res[0] = x)||1) || (res[0] = null);
		res[1] !== undefined && !isNaN(x = parseFloat(res[1])) && ((res[1] = x)||1) || (res[1] = null);
		res[2] !== undefined && (res[2] = find_easing_index(res[2]));

		if (in_timeline)
			res[3] = res[3] !== undefined ? res[3].length : 0;
	}

	return res;
}

function find_easing_index(name)
{
	for (var i = 0, n = easing_map.length; i < n; i += 2)
	{
		if (easing_map[i] === name)
			return (i / 2)|0;
	}

	return null;
}

function process_animation(anim, bones, slots)
{
	var result = {name: anim.name || ""};
	var fps = anim.fps || 20;
	var stack = [];

	for (var i = 0, nitems = anim.items.length; i < nitems; i++)
	{
		var item = anim.items[i];
		var is_slot = item.name.charAt(0) === "@";
		var name = find_name(is_slot ? slots : bones, is_slot ? item.name.substr(1) : item.name, null);

		if (name === null)
			continue;

		var has_color_timeline = false;

		if (is_slot)
		{
			var props = item.timelines.map(function f(x){return x.property;});

			if (props.indexOf("c") !== -1)
				has_color_timeline = true;
		}

		var list = is_slot ? result.slots || (result.slots = {}) : result.bones || (result.bones = {});
		var timelines = (list[name] = {});

		for (var j = 0, ntimelines = item.timelines.length; j < ntimelines; j++)
		{
			var prop = item.timelines[j].property;

			if (has_color_timeline && "rgba".indexOf(prop) !== -1)
				continue;

			if (!is_slot)
				prop = prop_map[prop];

			var timeline = (timelines[prop] = []);
			var commands = item.timelines[j].commands;

			var frame  = item.frame  || anim.frame  || 0;
			var step   = item.step   || anim.step   || 5;
			var easing = item.easing || anim.easing || 0;

			var last_push = -1;
			var last_value = 0;
			var last_keyframe = null;

			for (var k = 0, n = stack.length; k < n; k++)
				stack.pop();

			for (var k = 0, ncommands = commands.length; k < ncommands; k++)
			{
				var command = commands[k];
				var value = commands[++k];

				switch (command)
				{
					case cmd.set_frame:      value > frame && (frame = value); break;
					case cmd.set_step:       step = value; break;
					case cmd.advance_steps:  frame += step * value; break;
					case cmd.advance_frames: frame += value; break;

					case cmd.set_easing:
					{
						easing = value;

						if (last_keyframe !== null)
						{
							if (easing !== 0)
								last_keyframe["easing"] = easing_map[2 * easing + 1];
							else
								delete last_keyframe["easing"];
						}
					}
					break;

					case cmd.push_value_inc:
					case cmd.push_value_mul:
					{
						if (command === cmd.push_value_inc)
							value = last_value + value;
						else
							value = last_value * value;
					}

					case cmd.push_value:
					{
						var keyframe = null;

						if (frame === last_push)
						{
							keyframe = last_keyframe;
							keyframe.value = value;
							delete keyframe["easing"];
						}
						else if (frame > last_push)
						{
							keyframe = {"time": frame / fps, "value": value};
							timeline.push(keyframe);
						}

						if (easing !== 0)
							keyframe["easing"] = easing_map[2 * easing + 1];

						last_push = frame;
						last_value = value;
						last_keyframe = keyframe;
					}
					break;

					case cmd.begin_loop:
						stack.push({start_command: k--, prev_timeline: timeline, count: -1});
						timeline = [];
						break;

					case cmd.end_loop:
					{
						var n = stack.length;

						if (n > 0)
						{
							var state = stack[n - 1];

							if (state.count === -1)
							{
								if (value === 0)
								{
									stack.pop();
									timeline = state.prev_timeline;
									break;
								}

								state.count = value;
							}

							if (--state.count === 0)
							{
								var prev = state.prev_timeline;
								prev.push.apply(prev, timeline);
								timeline = prev;
								stack.pop();
							}
							else
							{
								k = state.start_command - 1;
							}
						}
					}
					break;
				}
			}

			if (timelines[prop].length === 0)
				delete timelines[prop];
		}

		if (has_color_timeline)
		{
			var timeline = timelines["c"];
			delete timelines["c"];

			var rgba = [
				(timelines["r"] = []),
				(timelines["g"] = []),
				(timelines["b"] = []),
				(timelines["a"] = [])
			];

			for (var j = 0, n = timeline.length; j < n; j++)
			{
				var key = timeline[j];

				if (key.easing)
				{
					for (var k = 0; k < 4; k++)
						rgba[k].push({"time": key.time, "value": key.value[k], "easing": key.easing});
				}
				else
				{
					for (var k = 0; k < 4; k++)
						rgba[k].push({"time": key.time, "value": key.value[k]});
				}
			}
		}
	}

	return result;
}

}(this));
