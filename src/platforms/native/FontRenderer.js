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
 * @package env.browser.FontRenderer;
 *
 * Render fonts or custom fonts on a Canvas context.
 */

import ui.Color as Color;
import ui.filter as filter;
import ui.resource.Font as Font;

var max = Math.max;

var _customFonts = {};
var _customFontInfo = {};

exports.init = function () {
  var manifest = window.CONFIG;
  if (manifest && manifest.fonts) {
    var fonts = manifest.fonts;
    for (var i = 0, len = fonts.length; i < len; i++) {
      var font = fonts[i];
      var customFont = {
        fontName: font.fontName,
        settings: font,
        imagesLoaded: -1,
        imagesTotal: 0,
        loaded: false
      }
      _customFonts[font.fontName] = customFont;
      loadingCustomFont(customFont);
    }
  }
};

var loadCustomFontImage = function(customFont, index, stroke) {
  var img = new Image();
  var url = 'resources/fonts/' + customFont.fontName + '_' + index + (stroke ? '_Stroke.png' : '.png');
  img.onload = function () {
    img.onload = null;
    customFont.imagesLoaded++;
    customFont.loaded = (customFont.imagesLoaded === customFont.imagesTotal);
  };
  img._src = url;
  img.src = url;
  return img;
};

var findVerticalInfo = function(dimensions) {
  // A..Z, a..z, all
  var ranges = [{start: 0x41, end: 0x5A}, {start: 0x61, end: 0x7A}, {start: 0x20, end: 0xFF}];
  var found = false;
  var baseline = 0;
  var bottom = 0;
  for (var i = 0, len = ranges.length; i < len; i++) {
    var range = ranges[i];
    for (var j = range.start; j <= range.end; j++) {
      var dimension = dimensions[j];
      if (dimension) {
        baseline = max(baseline, dimension.h);
        bottom = max(bottom, dimension.h);
        found = true;
      }
    }
    if (found) {
      break;
    }
  }
  return { baseline: baseline, bottom: bottom };
};

var findHorizontalInfo = function(dimensions) {
  // a..z, A..Z
  var ranges = [{start: 0x61, end: 0x7A}, {start: 0x41, end: 0x5A}, {start: 0x20, end: 0xFF}];
  var width = 0;
  var count = 0;
  for (var i = 0, len = ranges.length; i < len; i++) {
    var range = ranges[i];
    for (var j = range.start; j <= range.end; j++) {
      var dimension = dimensions[j];
      if (dimension) {
        width += dimension.w;
        count++;
      }
    }
    if (count !== 0) {
      break;
    }
  }
  return { width: 0.8 * width / count };
};

var loadingCustomFont = function(customFont) {
  if (customFont.imagesLoaded !== -1) {
    return !customFont.loaded;
  }

  var settings = customFont.settings;
  var fontName = settings.fontName;
  var info = _customFontInfo[fontName];
  if (info) {
    customFont.dimensions = info.dimensions;
    customFont.horizontal = info.horizontal;
    customFont.vertical = info.vertical;
  } else {
    var json = CACHE['resources/fonts/' + fontName + '.json'];
    customFont.dimensions = JSON.parse(json);
    customFont.horizontal = findHorizontalInfo(customFont.dimensions);
    customFont.vertical = findVerticalInfo(customFont.dimensions);

    _customFontInfo[fontName] = {
      dimensions: customFont.dimensions,
      horizontal: customFont.horizontal,
      vertical: customFont.vertical
    };
  }

  var images = customFont.images = [];
  var strokeImages = customFont.strokeImages = [];
  customFont.imagesLoaded = 0;
  for (var i = 0; i < settings.count; i++) {
    images.push(loadCustomFontImage(customFont, i, false));
    customFont.imagesTotal++;
    if (customFont.settings.stroke) {
      strokeImages.push(loadCustomFontImage(customFont, i, true));
      customFont.imagesTotal++;
    }
  }
  return true;
};

exports.findFontInfo = function (ctx) {
  var font = Font.parse(ctx.font);
  var name = font.getName();
  if (name && _customFonts[name]) {
    customFont = _customFonts[name];
    font.customFont = customFont;
    font.scale = font.getSize() / customFont.settings.size;
    return font;
  }
  return null;
};

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
  return function (text, x, y, maxWidth) {
    var fontInfo = exports.findFontInfo(this);
    if (!fontInfo) {
      return origFillText.apply(this, arguments);
    }
    if (loadingCustomFont(fontInfo.customFont)) {
      return;
    }

    var color = Color.parse(this.fillStyle);
    if (this.__compositeColor !== color) {
      this.__compositeColor = color;
      if (!this.__compositeFilter) {
        this.__compositeFilter = new filter.MultiplyFilter(color);
      }
      this.__compositeFilter.update(color);
    }
    this.setFilter(this.__compositeFilter);

    if (!this._ctx.fillTextBitmap(this, x, y, text + '', maxWidth, this.fillStyle, fontInfo, 0)) {
      return origFillText.apply(this, arguments);
    }
  }
};

exports.wrapStrokeText = function (origStrokeText) {
  return function (text, x, y, maxWidth) {
    var resetFilters = false;
    var fontInfo = exports.findFontInfo(this);
    if (!fontInfo) {
      return origStrokeText.apply(this, arguments);
    }
    if (loadingCustomFont(fontInfo.customFont)) {
      return;
    }

    var color = Color.parse(this.strokeStyle);
    if (this.__compositeStrokeColor !== color) {
      this.__compositeStrokeColor = color;
      if (!this.__compositeStrokeFilter) {
        this.__compositeStrokeFilter = new filter.MultiplyFilter(color);
      }
      this.__compositeStrokeFilter.update(color);
    }
    this.setFilter(this.__compositeStrokeFilter);

    if (!this._ctx.fillTextBitmap(this, x, y, text + '', maxWidth, this.strokeStyle, fontInfo, 1)) {
      return origStrokeText.apply(this, arguments);
    }
  }
};
