/* @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @package env.browser.FontRenderer;
 *
 * Render fonts or custom fonts on a Canvas context.
 */

import ui.resource.Font as Font;
import ui.Engine as Engine;
import .FontBuffer as FontBuffer;

import device;

var _customFonts = {};
var _customFontInfo = {};
var _fontMap = {};
var _buffers = [];
var _fontBuffer = false;

var _origMeasureText;
var _origFillText;
var _origStrokeText;

function loadCustomFontImage(customFont, index) {
	var image = new Image();

	image.onload = function() {
		image.onload = null;
		customFont.imagesLoaded++;
		customFont.loaded = (customFont.imagesLoaded === customFont.imagesTotal);
	}
	image.src = 'resources/fonts/' + customFont.filename + index + '.png';

	return image;
}

function findVerticalInfo(dimensions) {
	// A..Z, a..z, all
	var ranges = [{start: 0x41, end: 0x5A}, {start: 0x61, end: 0x7A}, {start: 0x20, end: 0xFF}];
	var range;
	var dimension;
	var found = false;
	var baseline = 0;
	var bottom = 0;
	var i;

	for (i = 0; i < ranges.length; i++) {
		range = ranges[i];
		for (j = range.start; j <= range.end; j++) {
			dimension = dimensions[j];
			if (dimension) {
				baseline = Math.max(baseline, dimension.h);
				bottom = Math.max(bottom, dimension.h);
				found = true;
			}
		}
		if (found) {
			break;
		}
	}

	return {
		baseline: baseline,
		bottom: bottom
	};
}

function findHorizontalInfo(dimensions) {
	// a..z, A..Z
	var ranges = [{start: 0x61, end: 0x7A}, {start: 0x41, end: 0x5A}, {start: 0x20, end: 0xFF}];
	var range;
	var dimension;
	var width = 0;
	var count = 0;
	var i, j;

	for (i = 0; i < ranges.length; i++) {
		range = ranges[i];
		for (j = range.start; j <= range.end; j++) {
			dimension = dimensions[j];
			if (dimension) {
				width += dimension.w;
				count++;
			}
		}
		if (count !== 0) {
			break;
		}
	}

	return {
		width: width / count
	};
}

function loadingCustomFont (customFont) {
	if (customFont.imagesLoaded !== -1) {
	 	return !customFont.loaded;
	}

	var settings = customFont.settings;
	var filename = settings.filename;
	var images;
	var image;
	var info;
	var i, j;

	if (_customFontInfo[filename]) {
		info = _customFontInfo[filename];
		customFont.dimensions = info.dimensions;
		customFont.horizontal = info.horizontal;
		customFont.vertical = info.vertical;
	} else {
		// Load from legacy .js extension or newer .json extension.
		var basename = 'resources/fonts/' + filename;
		var json = CACHE[basename + '.json'];
		if (json == null) {
			json = CACHE[basename + '.js'];
			if (json) {
				json = json.replace(/^\s*exports\s*=\s*|;\s*$/g, '');
			} else {
				logger.warn('Could not load font', customFont.name, 'from cached path', basename);
			}
		}
		customFont.dimensions = JSON.parse(json);
		customFont.horizontal = findHorizontalInfo(customFont.dimensions);
		customFont.vertical = findVerticalInfo(customFont.dimensions);

		_customFontInfo[filename] = {
			dimensions: customFont.dimensions,
			horizontal: customFont.horizontal,
			vertical: customFont.vertical
		};
	}

	customFont.images = [];
	customFont.imagesLoaded = 0;

	images = customFont.images;

	switch (customFont.type) {
		case 'color':
			for (i = 0; i < settings.count; i++) {
				images[i] = [];
				images[i].push(loadCustomFontImage(customFont, '_0_' + i));
				customFont.imagesTotal++;
			}
			break;

		case 'composite':
			for (i = 1; i < 3; i++) {
				images[i - 1] = [];
				for (j = 0; j < settings.count; j++) {
					images[i - 1].push(loadCustomFontImage(customFont, '_' + i + '_' + j));
					customFont.imagesTotal++;
				}
			}
			break;
	}

	return true;
}

(function() {
	var manifest = window.CONFIG;
	if (manifest && manifest.fonts) {
		var fonts = manifest.fonts;
		var font;
		var customFont;
		var i = fonts.length;

		while (i) {
			font = fonts[--i];
			customFont = {
				filename: font.filename,
				settings: font,
				imagesLoaded: -1,
				imagesTotal: 0,
				loaded: false,
				type: 'color'
			};
			_customFonts[font.contextName + ' color'] = customFont;
			loadingCustomFont(customFont);

			customFont = {
				// The difference between color- and composite-filename is in the suffix!!!
				filename: font.filename,
				settings: font,
				imagesLoaded: -1,
				imagesTotal: 0,
				loaded: false,
				type: 'composite'
			}
			_customFonts[font.contextName + ' composite'] = customFont;
			loadingCustomFont(customFont);
		}
	}
})();

function getCanvas() {
	return document.createElement('canvas');
}

function getBuffers(srcBuffers, customFont, color, type) {
	var key = customFont.filename + '_' + color + '_' + type;
	var dstBuffers = [];
	var i;

	if (!_buffers[key]) {
		_buffers[key] = {
			buffers: dstBuffers
		}
		for (i = 0; i < srcBuffers.length; i++) {
			var canvas = getCanvas(),
				ctx = canvas.getContext('2d'),
				width = srcBuffers[i].width,
				height = srcBuffers[i].height;

			dstBuffers[i] = canvas;

			canvas.width = width;
			canvas.height = height;

			ctx.save();
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, width, height);
			ctx.globalCompositeOperation = 'destination-in';
			ctx.drawImage(srcBuffers[i], 0, 0);
			ctx.restore();
		}
	}
	
	_buffers[key].lastUsed = +new Date();
	return _buffers[key].buffers;
}

function measure(ctx, fontInfo, text) {
	var customFont = fontInfo.customFont;
	var dimensions = customFont.dimensions;
	var scale = fontInfo.scale;
	var outline = (customFont.settings.outline || 0) * scale;
	var tracking = (customFont.settings.tracking || 0) * scale;
	var width = 0;

	if (dimensions) {
		var i = 0;
		var j = text.length;
		while (i < j) {
			character = text.charCodeAt(i);
			switch (character) {
				case 9: // tab...
					width += customFont.horizontal.width * 4 * scale;
					break;

				case 32: // space...
					width += customFont.horizontal.width * scale;
					break;

				default:
					if (dimensions[character]) {
						character = dimensions[character];
						width += (character.ow - 2) * scale;
					} else {
						var s = '';
						while (i < j) {
							s += text[i];
							if (dimensions[text.charCodeAt(i)]) {
								break;
							}
							i++;
						}

						var font = ctx.font;
						ctx.font = fontInfo.size.value + fontInfo.size.unit + ' ' + (ctx.defaultFontFamily || device.defaultFontFamily);
						width += _origMeasureText ? _origMeasureText.apply(ctx, [s]).width : 0;
						ctx.font = font;
					}
					break;
			}
			width += tracking - outline;
			i++;
		}
	}

	return {
		width: width + 2 * scale
	};
}

function renderCustomFont(ctx, x, y, text, color, fontInfo, index) {
	var customFont = fontInfo.customFont;
	var srcBuffers = customFont.images[index];
	var dimensions = customFont.dimensions;
	var scale = fontInfo.scale;
	var width = measure(ctx, fontInfo, text).width;
	var outline = (customFont.settings.outline || 0) * scale;
	var tracking = (customFont.settings.tracking || 0) * scale;

	switch (ctx.textBaseline) {
		case 'alphabetic':
			y -= customFont.vertical.baseline * scale;
			break;
		case 'middle':
			y -= (customFont.vertical.bottom / 2) * scale;
			break;
		case 'bottom':
			y -= customFont.vertical.bottom * scale;
			break;
	}

	switch (ctx.textAlign) {
		case 'center':
			x -= width / 2;
			break;
		case 'right':
			x -= width;
			break;
	}

	var buffer = false;
	var bufferX = x;
	var bufferY = y;
	var character;

	if (buffer) {
		x = buffer.x;
		y = buffer.y;
		ctx = buffer.ctx;
	}

	if (customFont.type === 'composite') {
		srcBuffers = getBuffers(srcBuffers, customFont, color, index);
	}

	if (!buffer || buffer.refresh) {
		var i = 0;
		var j = text.length;
		while (i < j) {
			character = text.charCodeAt(i);
			switch (character) {
				case 9: // tab...
					x += customFont.horizontal.width * 4 * scale + tracking - outline;
					break;

				case 32: // space...
					x += customFont.horizontal.width * scale + tracking - outline;
					break;

				default:
					if (dimensions[character]) {
						character = dimensions[character];
						ctx.drawImage(
							srcBuffers[character.i],
							character.x,
							character.y,
							character.w,
							character.h, 
							x,
							y + (character.oh - 1) * scale,
							(character.w - 2) * scale,
							(character.h - 2) * scale
						);
						x += (character.ow - 2) * scale + tracking - outline;
					} else {
						var s = '';
						while (i < j) {
							s += text[i];
							if (dimensions[text.charCodeAt(i)]) {
								break;
							}
							i++;
						}

						var font = ctx.font;
						ctx.font = fontInfo.size.value + fontInfo.size.unit + ' ' + (ctx.defaultFontFamily || device.defaultFontFamily);
						if (index === 0) {
							_origFillText && _origFillText.apply(ctx, [s, x, y]);
						} else {
							_origStrokeText && _origStrokeText.apply(ctx, [s, x, y]);
						}
						x += _origMeasureText ? _origMeasureText.apply(ctx, [s]).width : 0;
						ctx.font = font;
					}
					break;
			}

			i++;
		}
	}

	if (buffer) {
		this.drawImage(
			buffer.ctx.canvas,
			buffer.x,
			buffer.y,
			buffer.width,
			buffer.height,
			bufferX,
			bufferY,
			buffer.width,
			buffer.height
		);
	}
};

exports.findFontInfo = function(ctx) {
	var font = Font.parse(ctx.font);
	var name = font.getName();
	if (name && _customFonts[name]) {
		customFont = _customFonts[name];
		font.customFont = customFont;
		font.scale = font.getSize() / customFont.settings.size;
		return font;
	}

	return false;
}

exports.wrapMeasureText = function(origMeasureText) {
	_origMeasureText = origMeasureText;

	return function(text) {
		var fontInfo = exports.findFontInfo(this);

		if (!fontInfo) {
			return origMeasureText.apply(this, arguments);
		}

		return measure(this, fontInfo, text);
	}
};

exports.wrapFillText = function(origFillText) {
	_origFillText = origFillText;

	return function(text, x, y) {
		var fontInfo = exports.findFontInfo(this);

		if (!fontInfo) {
			return origFillText.apply(this, arguments);
		}
		if (loadingCustomFont(fontInfo.customFont)) {
			return;
		}

		renderCustomFont(this, x, y, text + '', this.fillStyle, fontInfo, 0);
	}
};

exports.wrapStrokeText = function(origStrokeText) {
	_origStrokeText = origStrokeText;

	return function(text, x, y) {
		var fontInfo = exports.findFontInfo(this);

		if (!fontInfo) {
			return origStrokeText.apply(this, arguments);
		}
		if (loadingCustomFont(fontInfo.customFont)) {
			return;
		}

		renderCustomFont(this, x, y, text + '', this.strokeStyle, fontInfo, 1);
	}
};

exports.getFontBuffer = function() {
	return _fontBuffer;
};

