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

import ui.Color as Color;
import ui.filter as filter;
import ui.resource.Font as Font;

var _customFonts = {},
	_customFontInfo = {};

function loadCustomFontImage(customFont, index) {
	var image = new Image();

	image.onload = function () {
		image.onload = null;
		customFont.imagesLoaded++;
		customFont.loaded = (customFont.imagesLoaded === customFont.imagesTotal);
	}
	image._src = 'resources/fonts/' + customFont.filename + index + '.png';
	image.src = image._src;

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

function loadingCustomFont(customFont) {
	if (customFont.imagesLoaded !== -1) {
	 	return !customFont.loaded;
	}

	var settings = customFont.settings,
		filename = settings.filename,
		images,
		image,
		info,
		i, j;

	if (_customFontInfo[filename]) {
		info = _customFontInfo[filename];
		customFont.dimensions = info.dimensions;
		customFont.horizontal = info.horizontal;
		customFont.vertical = info.vertical;
	} else {
		var basename = 'resources/fonts/' + filename;
		var json = CACHE[basename + '.json'];
		if (json == null) {
			var js = CACHE[basename + '.js'];
			if (js) {
				json = js.replace(/^\s*exports\s*=\s*|;\s*$/g, '');
			} else {
				return;
			}
		}

		customFont.dimensions = JSON.parse(json);
		customFont.horizontal = findHorizontalInfo(customFont.dimensions);
		customFont.horizontal.tracking = settings.tracking;
		customFont.horizontal.outline = settings.outline;
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

(function () {
	var manifest = window.CONFIG;

	if (manifest.fonts) {
		var fonts = manifest.fonts,
			font,
			customFont,
			i = fonts.length;

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
			//font.preloadColor && 
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
			//font.preloadComposite && 
			loadingCustomFont(customFont);
		}
	}
})();

exports.findFontInfo = function (ctx) {
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

exports.wrapMeasureText = function (origMeasureText) {
	return function (text) {
		var fontInfo = exports.findFontInfo(this);

		if (!fontInfo) {
			return origMeasureText.apply(this, arguments);
		}
		if (loadingCustomFont(fontInfo.customFont)) {
			return origMeasureText.apply(this, arguments);
		}
		var measureInfo = this._ctx.measureTextBitmap(text + '', fontInfo);
		if (measureInfo.failed) {
			return origMeasureText.apply(this, arguments);
		}

		return measureInfo;
	}
};

exports.wrapFillText = function (origFillText) {
	return function (text, x, y) {
		var fontInfo = exports.findFontInfo(this);

		if (!fontInfo) {
			return origFillText.apply(this, arguments);
		}

		if (loadingCustomFont(fontInfo.customFont)) {
			return;
		}

		if (fontInfo.customFont.type === 'composite') {
			var color = Color.parse(this.fillStyle);
			if (this.__compositeColor != color) {
				this.__compositeColor = color;
				if (!this.__compositeFilter) { this.__compositeFilter = []; }
				this.__compositeFilter[0] = new filter.MultiplyFilter(color);
			}

			var resetFilters = true;
			this.clearFilters();
			this.setFilters(this.__compositeFilter);
		}

		if (!this._ctx.fillTextBitmap(this, x, y, text + '', this.fillStyle, fontInfo, 0)) {
			return origFillText.apply(this, arguments);
		}

		if (resetFilters) {
			this.clearFilters();

			// TODO: might be nice to reset original filters... this is a bug in some cases otherwise
			// this.setFilters(originalFilters);
		}
	}
};

exports.wrapStrokeText = function (origStrokeText) {
	return function (text, x, y) {
		var fontInfo = exports.findFontInfo(this);

		if (!fontInfo) {
			return origStrokeText.apply(this, arguments);
		}

		if (loadingCustomFont(fontInfo.customFont)) {
			return;
		}

		if (fontInfo.customFont.type === 'composite') {
			var color = Color.parse(this.strokeStyle);
			if (this.__compositeStrokeColor != color) {
				this.__compositeStrokeColor = color;
				if (!this.__compositeStrokeFilter) { this.__compositeStrokeFilter = []; }
				this.__compositeStrokeFilter[0] = new filter.MultiplyFilter(color);
			}

			var resetFilters = true;
			this.clearFilters();
			this.setFilters(this.__compositeStrokeFilter);
		}

		if (!this._ctx.fillTextBitmap(this, x, y, text + '', this.strokeStyle, fontInfo, 1)) {
			return origStrokeText.apply(this, arguments);
		}

		if (resetFilters) {
			this.clearFilters();

			// TODO: might be nice to reset original filters... this is a bug in some cases otherwise
			// this.setFilters(originalFilters);
		}
	}
};
