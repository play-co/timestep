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

import device;

device.registerDevice('tealeaf', 'platforms.native');
exports.init = function () {
	// TODO: any init?
}

//TODO do fonts in a better way and then remove this entirely
if (!NATIVE.gl.initialized) {
	NATIVE.gl.initialized = true;
	
	if (NATIVE.gl.fonts) {
		var data = NATIVE.gl.fonts;
		var boldRe = /(bold|W6|wide)/i;
		var italicRe = /(italic|oblique)/i;
		var mediumRe = /(medium)/i;
		var lightRe = /(light)/i;

		var fontMap = {};
		for (var family in data) {
			var fonts = data[family];
			var familyMap = {};
		
			var keys = fonts.map(function (font) {
				var captures = /[\-]{1,1}(\w+)/.exec(font);
				var style = captures ? captures[1] : null;
				if (!style) {
					return 'normal';
				}
				if (boldRe.test(style)) {
					if (italicRe.test(style)) {
						return 'bolditalic';
					}else{
						return 'bold'
					}
				}
				if(italicRe.test(style)) {
					return 'italic';
				}
				if(mediumRe.test(style) && data[family].some(function (item) {
					return lightRe.test(item);
				})) {
					return 'bold';
				}
				return 'normal';
			});

			for (var i = 0, style; style = keys[i]; ++i) {
				familyMap[style] = fonts[i];
			}
			fontMap[family] = familyMap;
	 	}
		NATIVE.gl.fonts = fontMap;
	}
}
