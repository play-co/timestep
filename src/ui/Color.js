/**
 * @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

/**
 * @class ui.Color
 *
 * @doc http://doc.gameclosure.com/api/color.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/color.md
 */
var RGBA = exports = Class(function () {
	this.init = function (rgba) {
		if (arguments.length > 2) {
			this.r = arguments[0];
			this.g = arguments[1];
			this.b = arguments[2];
			this.a = (arguments[3] == undefined) ? 1 : arguments[3];
		} else if (typeof rgba == 'string') {
			this.parse(rgba);
		} else if (rgba) {
			this.set(rgba);
		}
	};

	this.set = function (rgba) {
		this.r = rgba.r || 0;
		this.g = rgba.g || 0;
		this.b = rgba.b || 0;
		this.a = 'a' in rgba ? rgba.a : 1;
	};

	this.get = function () {
		return {
			r: this.r,
			g: this.g,
			b: this.b,
			a: this.a
		};
	};

	this.toHex = function () {
		// https://gist.github.com/983535
		return "#" + ((256 + this.r << 8 | this.g) << 8 | this.b).toString(16).slice(1)
	};

	var rgbParser = /rgba?\(\s*([.0-9]+)\s*,\s*([.0-9]+)\s*,\s*([.0-9]+)\s*,?\s*([.0-9]+)?\s*\)/;

	function hexToRGB(a) {
		a = '0x' + a.slice(1).replace(a.length < 5 && /./g, '$&$&');
		return [a >> 16, a >> 8 & 255, a & 255];
	};

	this.parse = function (str) {
		var match = str.match(rgbParser);
		if (match) {
			this.r = parseInt(match[1]) || 0;
			this.g = parseInt(match[2]) || 0;
			this.b = parseInt(match[3]) || 0;
			if (4 in match) {
				var a = parseFloat(match[4]);
				this.a = isNaN(a) ? 1 : a;
			} else {
				this.a = 1;
			}
		} else {

			this.a = 1;

			if (str.length == 9) {
				str = str.substring(0, 7);
				this.a = '0x' + str.substring(7, 9) | 0;
			}

			var match = hexToRGB(str);
			if (match) {
				this.r = match[0];
				this.g = match[1];
				this.b = match[2];
			}
		}
	};

	this.toString = function () {
		return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
	};
});

exports.parse = function (str) {
	return cache[str] || (cache[str] = new RGBA(str));
};

var cache = {
	aliceblue:            new RGBA(240, 248, 255),
	antiquewhite:         new RGBA(250, 235, 215),
	aqua:                 new RGBA(  0, 255, 255),
	aquamarine:           new RGBA(127, 255, 212),
	azure:                new RGBA(240, 255, 255),
	beige:                new RGBA(245, 245, 220),
	bisque:               new RGBA(255, 228, 196),
	black:                new RGBA(  0,   0,   0),
	blanchedalmond:       new RGBA(255, 235, 205),
	blue:                 new RGBA(  0,   0, 255),
	blueviolet:           new RGBA(138,  43, 226),
	brown:                new RGBA(165,  42,  42),
	burlywood:            new RGBA(222, 184, 135),
	cadetblue:            new RGBA( 95, 158, 160),
	chartreuse:           new RGBA(127, 255,   0),
	chocolate:            new RGBA(210, 105,  30),
	coral:                new RGBA(255, 127,  80),
	cornflowerblue:       new RGBA(100, 149, 237),
	cornsilk:             new RGBA(255, 248, 220),
	crimson:              new RGBA(220,  20,  60),
	cyan:                 new RGBA(  0, 255, 255),
	darkblue:             new RGBA(  0,   0, 139),
	darkcyan:             new RGBA(  0, 139, 139),
	darkgoldenrod:        new RGBA(184, 134,  11),
	darkgray:             new RGBA(169, 169, 169),
	darkgreen:            new RGBA(  0, 100,   0),
	darkgrey:             new RGBA(169, 169, 169),
	darkkhaki:            new RGBA(189, 183, 107),
	darkmagenta:          new RGBA(139,   0, 139),
	darkolivegreen:       new RGBA( 85, 107,  47),
	darkorange:           new RGBA(255, 140,   0),
	darkorchid:           new RGBA(153,  50, 204),
	darkred:              new RGBA(139,   0,   0),
	darksalmon:           new RGBA(233, 150, 122),
	darkseagreen:         new RGBA(143, 188, 143),
	darkslateblue:        new RGBA( 72,  61, 139),
	darkslategray:        new RGBA( 47,  79,  79),
	darkslategrey:        new RGBA( 47,  79,  79),
	darkturquoise:        new RGBA(  0, 206, 209),
	darkviolet:           new RGBA(148,   0, 211),
	deeppink:             new RGBA(255,  20, 147),
	deepskyblue:          new RGBA(  0, 191, 255),
	dimgray:              new RGBA(105, 105, 105),
	dimgrey:              new RGBA(105, 105, 105),
	dodgerblue:           new RGBA( 30, 144, 255),
	firebrick:            new RGBA(178,  34,  34),
	floralwhite:          new RGBA(255, 250, 240),
	forestgreen:          new RGBA( 34, 139,  34),
	fuchsia:              new RGBA(255,   0, 255),
	gainsboro:            new RGBA(220, 220, 220),
	ghostwhite:           new RGBA(248, 248, 255),
	gold:                 new RGBA(255, 215,   0),
	goldenrod:            new RGBA(218, 165,  32),
	gray:                 new RGBA(128, 128, 128),
	grey:                 new RGBA(128, 128, 128),
	green:                new RGBA(  0, 128,   0),
	greenyellow:          new RGBA(173, 255,  47),
	honeydew:             new RGBA(240, 255, 240),
	hotpink:              new RGBA(255, 105, 180),
	indianred:            new RGBA(205,  92,  92),
	indigo:               new RGBA( 75,   0, 130),
	ivory:                new RGBA(255, 255, 240),
	khaki:                new RGBA(240, 230, 140),
	lavender:             new RGBA(230, 230, 250),
	lavenderblush:        new RGBA(255, 240, 245),
	lawngreen:            new RGBA(124, 252,   0),
	lemonchiffon:         new RGBA(255, 250, 205),
	lightblue:            new RGBA(173, 216, 230),
	lightcoral:           new RGBA(240, 128, 128),
	lightcyan:            new RGBA(224, 255, 255),
	lightgoldenrodyellow: new RGBA(250, 250, 210),
	lightgray:            new RGBA(211, 211, 211),
	lightgreen:           new RGBA(144, 238, 144),
	lightgrey:            new RGBA(211, 211, 211),
	lightpink:            new RGBA(255, 182, 193),
	lightsalmon:          new RGBA(255, 160, 122),
	lightseagreen:        new RGBA( 32, 178, 170),
	lightskyblue:         new RGBA(135, 206, 250),
	lightslategray:       new RGBA(119, 136, 153),
	lightslategrey:       new RGBA(119, 136, 153),
	lightsteelblue:       new RGBA(176, 196, 222),
	lightyellow:          new RGBA(255, 255, 224),
	lime:                 new RGBA(  0, 255,   0),
	limegreen:            new RGBA( 50, 205,  50),
	linen:                new RGBA(250, 240, 230),
	magenta:              new RGBA(255,   0, 255),
	maroon:               new RGBA(128,   0,   0),
	mediumaquamarine:     new RGBA(102, 205, 170),
	mediumblue:           new RGBA(  0,   0, 205),
	mediumorchid:         new RGBA(186,  85, 211),
	mediumpurple:         new RGBA(147, 112, 219),
	mediumseagreen:       new RGBA( 60, 179, 113),
	mediumslateblue:      new RGBA(123, 104, 238),
	mediumspringgreen:    new RGBA(  0, 250, 154),
	mediumturquoise:      new RGBA( 72, 209, 204),
	mediumvioletred:      new RGBA(199,  21, 133),
	midnightblue:         new RGBA( 25,  25, 112),
	mintcream:            new RGBA(245, 255, 250),
	mistyrose:            new RGBA(255, 228, 225),
	moccasin:             new RGBA(255, 228, 181),
	navajowhite:          new RGBA(255, 222, 173),
	navy:                 new RGBA(  0,   0, 128),
	oldlace:              new RGBA(253, 245, 230),
	olive:                new RGBA(128, 128,   0),
	olivedrab:            new RGBA(107, 142,  35),
	orange:               new RGBA(255, 165,   0),
	orangered:            new RGBA(255,  69,   0),
	orchid:               new RGBA(218, 112, 214),
	palegoldenrod:        new RGBA(238, 232, 170),
	palegreen:            new RGBA(152, 251, 152),
	paleturquoise:        new RGBA(175, 238, 238),
	palevioletred:        new RGBA(219, 112, 147),
	papayawhip:           new RGBA(255, 239, 213),
	peachpuff:            new RGBA(255, 218, 185),
	peru:                 new RGBA(205, 133,  63),
	pink:                 new RGBA(255, 192, 203),
	plum:                 new RGBA(221, 160, 221),
	powderblue:           new RGBA(176, 224, 230),
	purple:               new RGBA(128,   0, 128),
	red:                  new RGBA(255,   0,   0),
	rosybrown:            new RGBA(188, 143, 143),
	royalblue:            new RGBA( 65, 105, 225),
	saddlebrown:          new RGBA(139,  69,  19),
	salmon:               new RGBA(250, 128, 114),
	sandybrown:           new RGBA(244, 164,  96),
	seagreen:             new RGBA( 46, 139,  87),
	seashell:             new RGBA(255, 245, 238),
	sienna:               new RGBA(160,  82,  45),
	silver:               new RGBA(192, 192, 192),
	skyblue:              new RGBA(135, 206, 235),
	slateblue:            new RGBA(106,  90, 205),
	slategray:            new RGBA(112, 128, 144),
	slategrey:            new RGBA(112, 128, 144),
	snow:                 new RGBA(255, 250, 250),
	springgreen:          new RGBA(  0, 255, 127),
	steelblue:            new RGBA( 70, 130, 180),
	tan:                  new RGBA(210, 180, 140),
	teal:                 new RGBA(  0, 128, 128),
	thistle:              new RGBA(216, 191, 216),
	tomato:               new RGBA(255,  99,  71),
	transparent:          new RGBA(  0,   0,   0,   0),
	turquoise:            new RGBA( 64, 224, 208),
	violet:               new RGBA(238, 130, 238),
	wheat:                new RGBA(245, 222, 179),
	white:                new RGBA(255, 255, 255),
	whitesmoke:           new RGBA(245, 245, 245),
	yellow:               new RGBA(255, 255,   0),
	yellowgreen:          new RGBA(154, 205,  50)
};
