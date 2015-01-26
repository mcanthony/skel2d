define("ace/mode/skel2d",["require","exports","module","ace/lib/oop","ace/mode/text",
"ace/mode/text_highlight_rules"], function(require, exports, module) {

var oop = require("../lib/oop");
var TextMode = require("./text").Mode;
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

function double_jump(state, next_state)
{
	return function(s, stack) {
		stack.unshift(state, next_state);
		return state;
	};
}

function jump_to_next(state, stack)
{
	stack.shift();
	return stack.shift();
}

oop.inherits(HighlightRules, TextHighlightRules);

function HighlightRules()
{
	this.$rules = {
		"start": [
			{
				token: "text",
				regex: /\\$/,
				next: double_jump("invalid", "start")
			},
			{
				token: "keyword",
				regex: /^skeleton$/,
				next: "skel-body"
			},
			{
				token: "keyword",
				regex: /(^skeleton)(?=\s|\\$)/,
				next: "skel-header"
			},
			{
				token: "keyword",
				regex: /^anim$/,
				next: "anim-body"
			},
			{
				token: "keyword",
				regex: /(^anim)(?=\s|\\$)/,
				next: "anim-header"
			},
			{
				token: "keyword",
				regex: /^order$/,
				next: "order"
			},
			{
				token: "keyword",
				regex: /(^order)(?=\s|\\$)/,
				next: double_jump("invalid", "order")
			},
			{
				token: "keyword",
				regex: /^skin$/,
				next: "skin-body"
			},
			{
				token: "keyword",
				regex: /(^skin)(?=\s|\\$)/,
				next: "skin-header"
			},
			{
				token: "text",
				regex: /.+(?=\\$)/
			},
			{
				token: "text",
				regex: /.+/
			}
		],
		"invalid": [
			{
				token: "text",
				regex: /\\$/,
				next: "invalid"
			},
			{
				token: "text",
				regex: /.+(?=\\$)/
			},
			{
				token: "text",
				regex: /.+/
			},
			{
				regex: "",
				next: jump_to_next
			}
		],
		"skel-header": [
			{
				token: ["property", "value"],
				regex: /(#)([\da-fA-F]{3}|[\da-fA-F]{6})(?:,\d+(?:\.\d+)?)?(?=\s|\\$|$)/
			},
			{
				token: "text",
				regex: /\\$/,
				next: "skel-header"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: "skel-body"
			}
		],
		"skel-body": [
			// invalid bone (with 'skeleton' in name)
			{
				token: ["text", "text"],
				regex: /(^\t)((?:[a-zA-Z_\-][\w\-]*\.)*skeleton(?:\.[a-zA-Z_\-][\w\-]*)*)(?=\s|\\$)/,
				next: "skel-bone"
			},
			{
				token: ["text", "text"],
				regex: /(^\t)((?:[a-zA-Z_\-][\w\-]*\.)*skeleton(?:\.[a-zA-Z_\-][\w\-]*)*$)/
			},

			// bone
			{
				token: ["text", "bone"],
				regex: /(^\t)([a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*)(?=\s|\\$)/,
				next: "skel-bone"
			},
			{
				token: ["text", "bone"],
				regex: /(^\t)([a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*$)/
			},

			// invalid slot (with 'skeleton' in name)
			{
				token: ["text", "text"],
				regex: /(^\t\t)(@skeleton(?:\[[a-zA-Z_\-][\w\-]*\])?)(?=\s|\\$)/,
				next: "skel-slot"
			},
			{
				token: ["text", "text"],
				regex: /(^\t\t)(@skeleton(?:\[[a-zA-Z_\-][\w\-]*\])?$)/
			},
			{
				token: ["text", "text"],
				regex: /(^\t\t)(@(?:[a-zA-Z_\-][\w\-]*)?\[skeleton\])(?=\s|\\$)/,
				next: "skel-slot"
			},
			{
				token: ["text", "text"],
				regex: /(^\t\t)(@(?:[a-zA-Z_\-][\w\-]*)?\[skeleton\]$)/
			},

			// slot
			{
				token: ["text", "slot"],
				regex: /(^\t\t)(@(?:[a-zA-Z_\-][\w\-]*)?(?:\[[a-zA-Z_\-][\w\-]*\])?)(?=\s|\\$)/,
				next: "skel-slot"
			},
			{
				token: ["text", "slot"],
				regex: /(^\t\t)(@(?:[a-zA-Z_\-][\w\-]*)?(?:\[[a-zA-Z_\-][\w\-]*\])?$)/
			},

			// other
			{
				token: "text",
				regex: /^\s*$/
			},
			{
				token: "text",
				regex: /^(?=[^\t])/,
				next: "start"
			},
			{
				token: "text",
				regex: /\\$/,
				next: double_jump("invalid", "skel-body")
			},
			{
				token: "text",
				regex: /.+(?=\\$)/
			},
			{
				token: "text",
				regex: /.+/
			},
			{
				regex: "",
				next: "skel-body"
			}
		],
		"skel-bone": [
			{
				token: ["property", "value"],
				regex: /([xyrijl])(-?\d+(?:\.\d+)?)(?=\s|\\$|$)/
			},
			{
				token: ["property", "value"],
				regex: /(#)([\da-fA-F]{3}|[\da-fA-F]{6})(?:,\d+(?:\.\d+)?)?(?=\s|\\$|$)/
			},
			{
				token: "property",
				regex: /(?:no-rot|no-scale|flip-x|flip-y)(?=\s|\\$|$)/
			},
			{
				token: "text",
				regex: /\\$/,
				next: "skel-bone"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: "skel-body"
			}
		],
		"skel-slot": [
			{
				token: ["property", "value"],
				regex: /(#)([\da-fA-F]{3}|[\da-fA-F]{6})(?:,\d+(?:\.\d+)?)?(?=\s|\\$|$)/
			},
			{
				token: "attachment-type",
				regex: /(?::)(?:sprite|rect|circle|ellipse)(?=$)/
			},
			{
				token: "attachment-type",
				regex: /(?::)(?:sprite|rect|circle|ellipse)(?=\s|\\$)/,
				next: "skel-attachment"
			},
			{
				token: "attachment-type",
				regex: /:path$/,
				next: "skel-path-commands"
			},
			{
				token: "attachment-type",
				regex: /:path(?=\s|\\$)/,
				next: "skel-attachment-path"
			},
			{
				token: "text",
				regex: /\\$/,
				next: "skel-slot"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: "skel-body"
			}
		],
		"skel-attachment": [
			{
				token: ["property", "value"],
				regex: /([xyrijdtwhm])(-?\d+(?:\.\d+)?)(?=\s|\\$|$)/
			},
			{
				token: ["property", "value"],
				regex: /([fs])(#(?:[\da-fA-F]{3}|[\da-fA-F]{6})(?:,\d+(?:\.\d+)?)?)(?=\s|\\$|$)/
			},
			{
				token: "property",
				regex: /(?:(?:miter|bevel|round)-join|(?:butt|square|round)-cap)(?=\s|\\$|$)/
			},
			{
				token: "string",
				regex: /"\S+"(?=\s|\\$|$)/
			},
			{
				token: "text",
				regex: /\\$/,
				next: "skel-attachment"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: "skel-body"
			}
		],
		"skel-attachment-path": [
			{
				token: ["property", "value"],
				regex: /([xyrijtm])(-?\d+(?:\.\d+)?)(?=\s|\\$|$)/
			},
			{
				token: ["property", "value"],
				regex: /([fs])(#(?:[\da-fA-F]{3}|[\da-fA-F]{6})(?:,\d+(?:\.\d+)?)?)(?=\s|\\$|$)/
			},
			{
				token: "property",
				regex: /(?:(?:miter|bevel|round)-join|(?:butt|square|round)-cap)(?=\s|\\$|$)/
			},
			{
				token: "text",
				regex: /\\$/,
				next: "skel-attachment-path"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: "skel-path-commands"
			}
		],
		"skel-path-commands": [
			{
				token: "text",
				regex: /^\s*$/
			},
			{
				token: ["text", "command", "text", "bone"],
				regex: /(^\t\t\t)(:)(\s+)([a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*)(?=\s|\\$|$)/
			},
			{
				token: ["text", "command", "text"],
				regex: /(^\t\t\t)(:)(\s+.+)(?=\s|\\$|$)/
			},
			{
				token: ["text", "command"],
				regex: /(^\t\t\t)(M|L|Q|B|C)(?=\s|\\$)/,
				next: "skel-path-command"
			},
			{
				token: ["text", "command"],
				regex: /(^\t\t\t)(M|L|Q|B|C$)/
			},
			{
				token: "text",
				regex: /^(?=\t{0,2}[^\t])/,
				next: "skel-body"
			},
			{
				token: "text",
				regex: /\\$/,
				next: double_jump("invalid", "skel-path-commands")
			},
			{
				token: "text",
				regex: /.+(?=\\$)/
			},
			{
				token: "text",
				regex: /.+/
			},
			{
				regex: "",
				next: "skel-path-commands"
			}
		],
		"skel-path-command": [
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: ["value", "text", "value", "bone"],
				regex: /(-?\d+(?:\.\d+)?)(,)(-?\d+(?:\.\d+)?)/.source +
					/((?::(?:[a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*))?)/.source +
					/(?=\s|\\$|$)/.source
			},
			{
				token: "text",
				regex: /\\$/,
				next: "skel-path-command"
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: "skel-path-commands"
			}
		],
		"anim-header": [
			{
				token: "string",
				regex: /"\S+"(?=\s|\\$|$)/
			},
			{
				token: "anim-timing",
				regex: /(\d+)(fps)(?=\s|\\$|$)/
			},
			{
				token: "anim-timing",
				regex: /(?:\d+(?:\.\d+)?)?:/.source +
					/(?:\d+(?:\.\d+)?)?:/.source +
					/(?:[a-zA-Z_](?:[\w\-]*[a-zA-Z_])?)?/.source +
					/(?=\s|\\$|$)/.source
			},
			{
				token: "anim-timing",
				regex: /(?:\d+(?:\.\d+)?)?:/.source +
					/(?:\d+(?:\.\d+)?|[a-zA-Z_](?:[\w\-]*[a-zA-Z_])?)?/.source +
					/(?=\s|\\$|$)/.source
			},
			{
				token: "text",
				regex: /\\$/,
				next: "anim-header"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: "anim-body"
			}
		],
		"anim-body": [
			{
				token: ["text", "bone"],
				regex: /(^\t)([a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*)(?=\s|\\$)/,
				next: double_jump("anim-item", "anim-bone-timelines")
			},
			{
				token: ["text", "bone"],
				regex: /(^\t)([a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*$)/,
				next: "anim-bone-timelines"
			},
			{
				token: ["text", "slot"],
				regex: /(^\t)(@[a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*)(?=\s|\\$)/,
				next: double_jump("anim-item", "anim-slot-timelines")
			},
			{
				token: ["text", "slot"],
				regex: /(^\t)(@[a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*$)/,
				next: "anim-slot-timelines"
			},
			{
				token: "text",
				regex: /^\s*$/
			},
			{
				token: "text",
				regex: /^(?=[^\t])/,
				next: "start"
			},
			{
				token: "text",
				regex: /\\$/,
				next: double_jump("invalid", "anim-body")
			},
			{
				token: "text",
				regex: /.+(?=\\$)/
			},
			{
				token: "text",
				regex: /.+/
			},
			{
				regex: "",
				next: "anim-body"
			}
		],
		"anim-item": [
			{
				token: "anim-timing",
				regex: /(?:\d+(?:\.\d+)?)?:/.source +
					/(?:\d+(?:\.\d+)?)?:/.source +
					/(?:[a-zA-Z_](?:[\w\-]*[a-zA-Z_])?)?/.source +
					/(?=\s|\\$|$)/.source
			},
			{
				token: "anim-timing",
				regex: /(?:\d+(?:\.\d+)?)?:/.source +
					/(?:\d+(?:\.\d+)?|[a-zA-Z_](?:[\w\-]*[a-zA-Z_])?)?/.source +
					/(?=\s|\\$|$)/.source
			},
			{
				token: "text",
				regex: /\\$/,
				next: "anim-item"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: jump_to_next
			}
		],
		"anim-bone-timelines": [
			{
				token: "text",
				regex: /^\s*$/
			},
			{
				token: ["text", "property"],
				regex: /(^\t\t)([xyrij])(?=\s|\\$)/,
				next: double_jump("anim-timeline-num", "anim-bone-timelines")
			},
			{
				token: ["text", "property"],
				regex: /(^\t\t)([xyrij]$)/
			},
			{
				token: "text",
				regex: /^(?=\t?[^\t])/,
				next: "anim-body"
			},
			{
				token: "text",
				regex: /\\$/,
				next: double_jump("invalid", "anim-bone-timelines")
			},
			{
				token: "text",
				regex: /.+(?=\\$)/
			},
			{
				token: "text",
				regex: /.+/
			},
			{
				regex: "",
				next: "anim-bone-timelines"
			}
		],
		"anim-slot-timelines": [
			{
				token: "text",
				regex: /^\s*$/
			},
			{
				token: ["text", "property"],
				regex: /(^\t\t)([rgba])(?=\s|\\$)/,
				next: double_jump("anim-timeline-num", "anim-slot-timelines")
			},
			{
				token: ["text", "property"],
				regex: /(^\t\t)(@)(?=\s|\\$)/,
				next: double_jump("anim-timeline-attachment", "anim-slot-timelines")
			},
			{
				token: ["text", "property"],
				regex: /(^\t\t)(c)(?=\s|\\$)/,
				next: double_jump("anim-timeline-color", "anim-slot-timelines")
			},
			{
				token: ["text", "property"],
				regex: /(^\t\t)([@rgbac]$)/
			},
			{
				token: "text",
				regex: /^(?=\t?[^\t])/,
				next: "anim-body"
			},
			{
				token: "text",
				regex: /\\$/,
				next: double_jump("invalid", "anim-slot-timelines")
			},
			{
				token: "text",
				regex: /.+(?=\\$)/
			},
			{
				token: "text",
				regex: /.+/
			},
			{
				regex: "",
				next: "anim-slot-timelines"
			}
		],
		"anim-timeline-num": [
			{
				token: ["operator", "value"],
				regex: /([+*]?)(-?\d+(?:\.\d+)?)(?=\s|\\$|$)/
			},
			{
				token: "operator",
				regex: /(?:\{|\}(?:\[\d+\])?|-*>)(?=\s|\\$|$)/
			},
			{
				token: ["anim-timing", "operator"],
				regex: "(" +
					/(?:\+?\d+(?:\.\d+)?)?:/.source +
					/(?:\d+(?:\.\d+)?)?:/.source +
					/(?:[a-zA-Z_](?:[\w\-]*[a-zA-Z_])?)?/.source +
					")" + /(-*>)(?=\s|\\$|$)/.source
			},
			{
				token: ["anim-timing", "operator"],
				regex: /((?:\+?\d+(?:\.\d+)?):(?:\d+(?:\.\d+)?)?)(-*>)(?=\s|\\$|$)/
			},
			{
				token: ["anim-timing", "operator"],
				regex: /((?:\d+(?:\.\d+)?)?:(?:[a-zA-Z_](?:[\w\-]*[a-zA-Z_])?))(-*>)(?=\s|\\$|$)/
			},
			{
				token: "text",
				regex: /\\$/,
				next: "anim-timeline-num"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: jump_to_next
			}
		],
		"anim-timeline-color": [
			{
				token: "value",
				regex: /(?:#(?:[\da-fA-F]{3}|[\da-fA-F]{6})(?:,\d+(?:\.\d+)?)?)(?=\s|\\$|$)/
			},
			{
				token: "operator",
				regex: /(?:\{|\}(?:\[\d+\])?|-*>)(?=\s|\\$|$)/
			},
			{
				token: ["anim-timing", "operator"],
				regex: "(" +
					/(?:\+?\d+(?:\.\d+)?)?:/.source +
					/(?:\d+(?:\.\d+)?)?:/.source +
					/(?:[a-zA-Z_](?:[\w\-]*[a-zA-Z_])?)?/.source +
					")" + /(-*>)(?=\s|\\$|$)/.source
			},
			{
				token: ["anim-timing", "operator"],
				regex: /((?:\+?\d+(?:\.\d+)?):(?:\d+(?:\.\d+)?)?)(-*>)(?=\s|\\$|$)/
			},
			{
				token: ["anim-timing", "operator"],
				regex: /((?:\d+(?:\.\d+)?)?:(?:[a-zA-Z_](?:[\w\-]*[a-zA-Z_])?))(-*>)(?=\s|\\$|$)/
			},
			{
				token: "text",
				regex: /\\$/,
				next: "anim-timeline-color"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: jump_to_next
			}
		],
		"anim-timeline-attachment": [
			{
				token: "slot",
				regex: /(?:[a-zA-Z_\-][\w\-]*)(?=\s|\\$|$)/
			},
			{
				token: "operator",
				regex: /(?:\{|\}(?:\[\d+\])?|-*>)(?=\s|\\$|$)/
			},
			{
				token: ["anim-timing", "operator"],
				regex: "(" +
					/(?:\+?\d+(?:\.\d+)?)?:/.source +
					/(?:\d+(?:\.\d+)?)?:/.source +
					/(?:[a-zA-Z_](?:[\w\-]*[a-zA-Z_])?)?/.source +
					")" + /(-*>)(?=\s|\\$|$)/.source
			},
			{
				token: ["anim-timing", "operator"],
				regex: /((?:\+?\d+(?:\.\d+)?):(?:\d+(?:\.\d+)?)?)(-*>)(?=\s|\\$|$)/
			},
			{
				token: ["anim-timing", "operator"],
				regex: /((?:\d+(?:\.\d+)?)?:(?:[a-zA-Z_](?:[\w\-]*[a-zA-Z_])?))(-*>)(?=\s|\\$|$)/
			},
			{
				token: "text",
				regex: /\\$/,
				next: "anim-timeline-attachment"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: jump_to_next
			}
		],
		"order": [
			{
				token: ["text", "slot"],
				regex: /(^\t)(@[a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*)(?=\s|\\$|$)/
			},
			{
				token: "text",
				regex: /^\s*$/
			},
			{
				token: "text",
				regex: /^(?=[^\t])/,
				next: "start"
			},
			{
				token: "text",
				regex: /\\$/,
				next: double_jump("invalid", "order")
			},
			{
				token: "text",
				regex: /.+(?=\\$)/
			},
			{
				token: "text",
				regex: /.+/
			},
			{
				regex: "",
				next: "order"
			}
		],
		"skin-header": [
			{
				token: "string",
				regex: /"\S+"(?=\s|\\$|$)/
			},
			{
				token: "text",
				regex: /\\$/,
				next: "skin-header"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: "skin-body"
			}
		],
		"skin-body": [
			{
				token: ["text", "slot"],
				regex: /(^\t)(@[a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*$)/
			},
			{
				token: ["text", "slot"],
				regex: "(^\\t)(" +
					/@[a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*/.source +
					/(?:\[[a-zA-Z_\-][\w\-]*\])?/.source + ")" +
					/(?=\s|\\$)/.source,
				next: "skin-item"
			},
			{
				token: "text",
				regex: /^\s*$/
			},
			{
				token: "text",
				regex: /^(?=[^\t])/,
				next: "start"
			},
			{
				token: "text",
				regex: /\\$/,
				next: double_jump("invalid", "skin-body")
			},
			{
				token: "text",
				regex: /.+(?=\\$)/
			},
			{
				token: "text",
				regex: /.+/
			},
			{
				regex: "",
				next: "skin-body"
			}
		],
		"skin-item": [
			{
				token: "attachment-type",
				regex: /(?::)(?:sprite|rect|circle|ellipse)(?=$)/
			},
			{
				token: "attachment-type",
				regex: /(?::)(?:sprite|rect|circle|ellipse)(?=\s|\\$)/,
				next: "skin-attachment"
			},
			{
				token: "attachment-type",
				regex: /:path$/,
				next: "skin-path-commands"
			},
			{
				token: "attachment-type",
				regex: /:path(?=\s|\\$)/,
				next: "skin-attachment-path"
			},
			{
				token: "text",
				regex: /\\$/,
				next: "skin-item"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: "skin-body"
			}
		],
		"skin-attachment": [
			{
				token: ["property", "value"],
				regex: /([xyrijdtwhm])(-?\d+(?:\.\d+)?)(?=\s|\\$|$)/
			},
			{
				token: ["property", "value"],
				regex: /([fs])(#(?:[\da-fA-F]{3}|[\da-fA-F]{6})(?:,\d+(?:\.\d+)?)?)(?=\s|\\$|$)/
			},
			{
				token: "property",
				regex: /(?:(?:miter|bevel|round)-join|(?:butt|square|round)-cap)(?=\s|\\$|$)/
			},
			{
				token: "string",
				regex: /"\S+"(?=\s|\\$|$)/
			},
			{
				token: "text",
				regex: /\\$/,
				next: "skin-attachment"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: "skin-body"
			}
		],
		"skin-attachment-path": [
			{
				token: ["property", "value"],
				regex: /([xyrijtm])(-?\d+(?:\.\d+)?)(?=\s|\\$|$)/
			},
			{
				token: ["property", "value"],
				regex: /([fs])(#(?:[\da-fA-F]{3}|[\da-fA-F]{6})(?:,\d+(?:\.\d+)?)?)(?=\s|\\$|$)/
			},
			{
				token: "property",
				regex: /(?:(?:miter|bevel|round)-join|(?:butt|square|round)-cap)(?=\s|\\$|$)/
			},
			{
				token: "text",
				regex: /\\$/,
				next: "skin-attachment-path"
			},
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: "skin-path-commands"
			}
		],
		"skin-path-commands": [
			{
				token: "text",
				regex: /^\s*$/
			},
			{
				token: ["text", "command", "text", "bone"],
				regex: /(^\t\t)(:)(\s+)([a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*)(?=\s|\\$|$)/
			},
			{
				token: ["text", "command", "text"],
				regex: /(^\t\t)(:)(\s+.+)(?=\s|\\$|$)/
			},
			{
				token: ["text", "command"],
				regex: /(^\t\t)(M|L|Q|B|C)(?=\s|\\$)/,
				next: "skin-path-command"
			},
			{
				token: ["text", "command"],
				regex: /(^\t\t)(M|L|Q|B|C$)/
			},
			{
				token: "text",
				regex: /^(?=\t?[^\t])/,
				next: "skin-body"
			},
			{
				token: "text",
				regex: /\\$/,
				next: double_jump("invalid", "skin-path-commands")
			},
			{
				token: "text",
				regex: /.+(?=\\$)/
			},
			{
				token: "text",
				regex: /.+/
			},
			{
				regex: "",
				next: "skin-path-commands"
			}
		],
		"skin-path-command": [
			{
				token: "text",
				regex: /\s+/
			},
			{
				token: ["value", "text", "value", "bone"],
				regex: /(-?\d+(?:\.\d+)?)(,)(-?\d+(?:\.\d+)?)/.source +
					/((?::(?:[a-zA-Z_\-][\w\-]*(?:\.[a-zA-Z_\-][\w\-]*)*))?)/.source +
					/(?=\s|\\$|$)/.source
			},
			{
				token: "text",
				regex: /\\$/,
				next: "skin-path-command"
			},
			{
				token: "text",
				regex: /\S+(?=\\$|\s)/
			},
			{
				regex: "",
				next: "skin-path-commands"
			}
		]
	};
}

oop.inherits(Mode, TextMode);

function Mode()
{
	this.HighlightRules = HighlightRules;
}

Mode.prototype.$id = "ace/mode/skel2d";

exports.Mode = Mode;

});
