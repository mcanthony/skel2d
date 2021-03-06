(function(scope) {

scope.SkeletonRenderer = SkeletonRenderer;

var path = new Path();
var coords = [];
var bone_color = [0, 0, 0, 0];
var matrix_pool = [sk2.mat2d()];
var view_transform = mat3();
var kappa90 = 0.5522847493;

bone_color[0] = (bone_color[3] * bone_color[0] * 255)|0;
bone_color[1] = (bone_color[3] * bone_color[1] * 255)|0;
bone_color[2] = (bone_color[3] * bone_color[2] * 255)|0;
bone_color[3] = (bone_color[3] * 255)|0;

function mat2d_alloc() { return matrix_pool.length > 0 ? matrix_pool.pop() : sk2.mat2d(); }
function mat2d_free(m) { matrix_pool.push(m); }

function clear_coords()
{
	for (var i = 0, n = coords.length; i < n; i++)
		coords.pop();
}

function SkeletonRenderer(gfx)
{
	this.gfx = gfx;
	this.vbo = gfx.create_vbo(500, gfx.Stream);
	this.ibo = gfx.create_ibo(500, gfx.Stream);
	this.show_bones = true;
	this.dont_draw = false;
}

SkeletonRenderer.prototype.draw = function(skeleton, x, y, scale, skin_index)
{
	var gfx = this.gfx;
	var vbo = this.vbo;
	var ibo = this.ibo;
	var skin = skeleton.skins[skin_index];

	var m = view_transform;
	var s = scale;

	m[0] = s; m[3] = 0; m[6] = x * s;
	m[1] = 0; m[4] = s; m[7] = y * s;
	m[2] = 0; m[5] = 0; m[8] = 1;

	vbo.clear();
	ibo.clear();

	path.set_pixel_ratio(scale);

	for (var i = 0, n = skeleton.order.length; i < n; i++)
	{
		var slot = skeleton.slots[skeleton.order[i]];
		var attachment_index = slot.current_state.attachment;

		if (attachment_index < 0)
			continue;

		var attachment = skin.attachments[attachment_index];

		switch (attachment.type)
		{
			case sk2.AttachmentRect:    add_rect(slot, attachment, vbo, ibo); break;
			case sk2.AttachmentEllipse: add_ellipse(slot, attachment, vbo, ibo); break;
			case sk2.AttachmentCircle:  add_ellipse(slot, attachment, vbo, ibo); break;
			case sk2.AttachmentPath:    add_path(skeleton, slot, attachment, vbo, ibo); break;
		}
	}

	var count = ibo.size;
	var lines_offset = vbo.size;

	if (this.show_bones)
	{
		var nbones = skeleton.bones.length;

		vbo.reserve(vbo.size + nbones * 12);
		ibo.reserve(ibo.size + 3 * nbones * 10);

		add_bones(skeleton, vbo, ibo, scale);

		count = ibo.size;
		lines_offset = vbo.size;

		add_bone_marks(skeleton, vbo, ibo);
	}

	if (this.dont_draw)
		return;

	vbo.upload();
	ibo.upload();

	gfx.transform(m);
	gfx.draw(gfx.Triangles, vbo, ibo, 0, count);

	if (this.show_bones)
	{
		m[0] = m[4] = 1;
		m[6] = m[7] = 0;

		gfx.transform(m);
		gfx.draw(gfx.Lines, vbo, null, lines_offset, 4 * skeleton.bones.length);
	}
}

function add_bones(skeleton, vbo, ibo, scale)
{
	var aa = 2 / scale;
	var s = 5;
	var sa = s + aa;
	var nbones = skeleton.bones.length;

	for (var i = 0, n = nbones; i < n; i++)
	{
		var bone = skeleton.bones[i];

		if (bone.length >= 2 * s)
		{
			var base = vbo.size;
			var l = bone.length;
			var la = sa * (l / s);
			var alpha = 0.7 * bone.color.a;

			bone_color[0] = (alpha * bone.color.r * 255)|0;
			bone_color[1] = (alpha * bone.color.g * 255)|0;
			bone_color[2] = (alpha * bone.color.b * 255)|0;
			bone_color[3] = (alpha * 255)|0;

			vbo.push(bone.to_worldx(-s,  0), bone.to_worldy(-s,  0), 0, 0, bone_color);
			vbo.push(bone.to_worldx( 0,  s), bone.to_worldy( 0,  s), 0, 0, bone_color);
			vbo.push(bone.to_worldx( l,  0), bone.to_worldy( l,  0), 0, 0, bone_color);
			vbo.push(bone.to_worldx( 0, -s), bone.to_worldy( 0, -s), 0, 0, bone_color);

			vbo.push(bone.to_worldx(-sa,   0), bone.to_worldy(-sa,   0), 0, 1, bone_color);
			vbo.push(bone.to_worldx(  0,  sa), bone.to_worldy(  0,  sa), 0, 1, bone_color);
			vbo.push(bone.to_worldx( la,   0), bone.to_worldy( la,   0), 0, 1, bone_color);
			vbo.push(bone.to_worldx(  0, -sa), bone.to_worldy(  0, -sa), 0, 1, bone_color);

			ibo.push(base + 0, base + 1, base + 2);
			ibo.push(base + 0, base + 2, base + 3);

			ibo.push(base + 0, base + 4, base + 1);
			ibo.push(base + 4, base + 1, base + 5);
			ibo.push(base + 0, base + 4, base + 3);
			ibo.push(base + 4, base + 3, base + 7);

			ibo.push(base + 1, base + 5, base + 2);
			ibo.push(base + 5, base + 2, base + 6);
			ibo.push(base + 3, base + 7, base + 2);
			ibo.push(base + 7, base + 2, base + 6);
		}
	}
}

function add_bone_marks(skeleton, vbo, ibo)
{
	var nbones = skeleton.bones.length;
	var m = view_transform;
	var s = 3;

	bone_color[0] = 0;
	bone_color[1] = 0;
	bone_color[2] = 0;
	bone_color[3] = 255;

	for (var i = 0, n = nbones; i < n; i++)
	{
		var bone = skeleton.bones[i];
		var base = vbo.size;
		var px = bone.to_worldx(0, 0);
		var py = bone.to_worldy(0, 0);
		var x = Math.floor(mat3mulx(m, px, py));
		var y = Math.floor(mat3muly(m, px, py));

		vbo.push(x - s - 0.5, y, 0, 0, bone_color);
		vbo.push(x + s + 0.5, y, 0, 0, bone_color);
		vbo.push(x, y - s - 0.5, 0, 0, bone_color);
		vbo.push(x, y + s + 0.5, 0, 0, bone_color);
	}
}

function add_rect(slot, attachment, vbo, ibo)
{
	var m = sk2.mat2d_mul(slot.bone.world_transform, attachment.transform, mat2d_alloc());
	var r = attachment.border_radius;
	var w = attachment.width;
	var h = attachment.height;

	if (r > path.dist_tol)
	{
		var rx = Math.min(r, Math.abs(w) * 0.5) * (w > 0 ? 1 : -1);
		var ry = Math.min(r, Math.abs(h) * 0.5) * (h > 0 ? 1 : -1);

		var k = 1 - kappa90;

		coords.push(0, ry);
		coords.push(0, h - ry);
		coords.push(0, h - ry * k, rx * k, h, rx, h);
		coords.push(w - rx, h);
		coords.push(w - rx * k, h, w, h - ry * k, w, h - ry);
		coords.push(w, ry);
		coords.push(w, ry * k, w - rx * k, 0, w - rx, 0);
		coords.push(rx, 0);
		coords.push(rx * k, 0, 0, ry * k, 0, ry);

		var cx = w / 2;
		var cy = h / 2;

		for (var i = 0, n = coords.length; i < n; i += 2)
		{
			var x = coords[i + 0] - cx;
			var y = coords[i + 1] - cy;
			coords[i + 0] = sk2.mat2d_mulx(m, x, y);
			coords[i + 1] = sk2.mat2d_muly(m, x, y);
		}

		path.begin(coords[0], coords[1]);

		for (var i = 0, j = 2, p = coords; i < 4; i++, j += 8)
		{
			path.line_to(p[j + 0], p[j + 1]);
			path.bezier_to(p[j + 2], p[j + 3], p[j + 4], p[j + 5], p[j + 6], p[j + 7]);
		}

		path.close();
		clear_coords();
	}
	else
	{
		var cx = w / 2;
		var cy = h / 2;

		path.begin(  sk2.mat2d_mulx(m, 0 - cx, 0 - cy), sk2.mat2d_muly(m, 0 - cx, 0 - cy));
		path.line_to(sk2.mat2d_mulx(m, w - cx, 0 - cy), sk2.mat2d_muly(m, w - cx, 0 - cy));
		path.line_to(sk2.mat2d_mulx(m, w - cx, h - cy), sk2.mat2d_muly(m, w - cx, h - cy));
		path.line_to(sk2.mat2d_mulx(m, 0 - cx, h - cy), sk2.mat2d_muly(m, 0 - cx, h - cy));
		path.close();
	}

	stroke_and_fill(slot, attachment, true, vbo, ibo);
	mat2d_free(m);
}

function add_ellipse(slot, attachment, vbo, ibo)
{
	var m = sk2.mat2d_mul(slot.bone.world_transform, attachment.transform, mat2d_alloc());
	var rx = 0;
	var ry = 0;
	var w = attachment.line_width;
	var line_color = attachment.line_color;

	if (attachment.type === sk2.AttachmentEllipse)
	{
		rx = attachment.rx;
		ry = attachment.ry;
	}
	else
	{
		rx = attachment.radius;
		ry = attachment.radius;
	}

	if (w === 0)
	{
		var dx = m[4];
		var dy = m[5];

		m[4] = 0;
		m[5] = 0;

		var sxx = sk2.mat2d_mulx(m, 1, 0);
		var sxy = sk2.mat2d_muly(m, 1, 0);
		var syx = sk2.mat2d_mulx(m, 0, 1);
		var syy = sk2.mat2d_muly(m, 0, 1);

		m[4] = dx;
		m[5] = dy;

		rx = Math.abs(rx);
		ry = Math.abs(ry);

		var sx = Math.abs(Math.sqrt(sxx * sxx + sxy * sxy)) * path.pixel_ratio;
		var sy = Math.abs(Math.sqrt(syx * syx + syy * syy)) * path.pixel_ratio;
		var aa = Math.min(5, Math.min(rx * sx, ry * sy));

		rx = rx - 0.5 * aa / sx;
		ry = ry - 0.5 * aa / sy;

		attachment.line_width = aa / path.pixel_ratio;
		attachment.line_color = attachment.fill_color;
	}

	var k = kappa90;
	var p = coords;

	p.push(-rx, 0);
	p.push(-rx, ry * k, -rx * k, ry, 0, ry);
	p.push(rx * k, ry, rx, ry * k, rx, 0);
	p.push(rx, -ry * k, rx * k, -ry, 0, -ry);
	p.push(-rx * k, -ry, -rx, -ry * k, -rx, 0);

	for (var i = 0, n = p.length; i < n; i += 2)
	{
		var x = p[i + 0];
		var y = p[i + 1];
		p[i + 0] = sk2.mat2d_mulx(m, x, y);
		p[i + 1] = sk2.mat2d_muly(m, x, y);
	}

	path.begin(p[0], p[1]);

	for (var i = 0, j = 2; i < 4; i++, j += 6)
		path.bezier_to(p[j + 0], p[j + 1], p[j + 2], p[j + 3], p[j + 4], p[j + 5]);

	path.close();
	clear_coords();
	stroke_and_fill(slot, attachment, true, vbo, ibo);
	mat2d_free(m);

	attachment.line_width = w;
	attachment.line_color = line_color;
}

function add_path(skeleton, slot, attachment, vbo, ibo)
{
	var commands = attachment.commands;
	var ncommands = commands.length;
	var points = attachment.points;
	var slot_bone = slot.bone;

	if (ncommands === 0)
		return;

	var m = sk2.mat2d_mul(slot_bone.world_transform, attachment.transform, mat2d_alloc());
	var im = sk2.mat2d_inverse(slot_bone.world_transform, mat2d_alloc());

	var closed = false;

	for (var i = 0, j = 0; i < ncommands; i++)
	{
		var npoints = 0;
		var path_func = null;

		switch (commands[i])
		{
			case "M": npoints = 1; path_func = path.begin; break;
			case "L": npoints = 1; path_func = path.line_to; break;
			case "B": npoints = 3; path_func = path.bezier_to; break;
			case "Q": npoints = 2; path_func = path.quad_to; break;
			case "C": npoints = 0; path_func = path.close; break;
		}

		for (var k = 0; k < npoints; k++)
		{
			var p = points[j++];
			var bone = skeleton.bones[p.bone];
			var x = p.x;
			var y = p.y;

			if (bone !== slot_bone)
			{
				var wx = bone.to_worldx(x, y);
				var wy = bone.to_worldy(x, y);
				x = sk2.mat2d_mulx(im, wx, wy);
				y = sk2.mat2d_muly(im, wx, wy);
			}

			coords.push(sk2.mat2d_mulx(m, x, y));
			coords.push(sk2.mat2d_muly(m, x, y));
		}

		path_func.apply(path, coords);
		clear_coords();

		if (path_func === path.close)
		{
			closed = true;
			break;
		}
	}

	path.line_cap = attachment.line_cap;
	stroke_and_fill(slot, attachment, closed, vbo, ibo);

	mat2d_free(m);
	mat2d_free(im);
}

function stroke_and_fill(slot, attachment, closed, vbo, ibo)
{
	var w = attachment.line_width;
	var slot_color = slot.current_state;

	path.stroke_width = w;
	path.line_join = attachment.line_join;
	path.miter_limit = attachment.miter_limit;

	if (closed)
	{
		var src = attachment.fill_color;
		var alpha = slot_color.a * src.a;

		if (alpha > 0)
		{
			var dst = path.fill_color;

			dst[0] = (alpha * slot_color.r * src.r * 255)|0;
			dst[1] = (alpha * slot_color.g * src.g * 255)|0;
			dst[2] = (alpha * slot_color.b * src.b * 255)|0;
			dst[3] = (alpha * 255)|0;

			path.fill(vbo, ibo);
		}
	}

	if (w > 0)
	{
		var src = attachment.line_color;
		var dst = path.stroke_color;
		var alpha = slot_color.a * src.a;

		dst[0] = (alpha * slot_color.r * src.r * 255)|0;
		dst[1] = (alpha * slot_color.g * src.g * 255)|0;
		dst[2] = (alpha * slot_color.b * src.b * 255)|0;
		dst[3] = (alpha * 255)|0;

		path.stroke(vbo, ibo);
	}
	else if (closed)
	{
		var src = attachment.fill_color;
		var alpha = slot_color.a * src.a;

		if (alpha > 0)
		{
			var dst = path.stroke_color;

			dst[0] = (alpha * slot_color.r * src.r * 255)|0;
			dst[1] = (alpha * slot_color.g * src.g * 255)|0;
			dst[2] = (alpha * slot_color.b * src.b * 255)|0;
			dst[3] = (alpha * 255)|0;

			path.stroke_width = 1;
			path.stroke(vbo, ibo);
		}
	}
}

}(this));
