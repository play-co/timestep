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
 * package ui.backend.canvas.TextView;
 *
 * canvas.TextView implementation.
 */

import ui.View as View;
import ui.layout.Padding as Padding;
import device;
import .util.FragmentBuffer as FragmentBuffer;
import .TextFlow;

import ...legacySettings as legacySettings;

var messageMultiline = true;
var messageTextAlign = true;
var messageFont = true;

/**
 * @extends ui.View
 */
var TextView = exports = Class(View, function(supr) {

	var defaults = {
		// layout properties...
		wrap: false,
		autoSize: false,
		autoFontSize: true,
		padding: new Padding(0),
		lineHeight: 1.2,

		// font properties...
		color: "#000000",
		fontFamily: device.defaultFontFamily,
		fontWeight: "",
		size: 12,
		lineWidth: 2,
		outlineColor: null,
		shadowColor: null,

		// alignment properties...
		verticalAlign: "middle",
		horizontalAlign: "center",

		// misc properties...
		backgroundColor: null
	};

	var clearCache = {
		// basic widget properties...
		width: true,
		height: true,

		// layout properties...
		wrap: true,
		autoSize: true,
		autoFontSize: true,
		padding: true,
		lineHeight: true,

		// font properties...
		color: false,
		fontFamily: true,
		fontWeight: true,
		size: true,
		lineWidth: false,
		outlineColor: false,
		shadowColor: false,

		// alignment properties...
		verticalAlign: true,
		horizontalAlign: true,

		// misc properties...
		backgroundColor: false,
		text: true
	};
	var clearCacheKeys = Object.keys(clearCache);

	var savedOpts = [
		"width",
		"height",
		"size"
	];

	var fontBuffer = new FragmentBuffer();

	fontBuffer.onGetHash = function (desc) {
		if (!desc.hash) {
			var i = clearCacheKeys.length;
			desc.hash = "";
			while (i) {
				desc.hash += desc[clearCacheKeys[--i]] || "";
			}
		}
		return desc.hash;
	};

	this.init = function (opts) {
		this._opts = {};
		this._optsLast = {};
		this._cacheUpdate = true;

		this._textFlow = new TextFlow({target: this});
		this._textFlow.subscribe("ChangeWidth", this, "onChangeWidth");
		this._textFlow.subscribe("ChangeHeight", this, "onChangeHeight");
		this._textFlow.subscribe("ChangeSize", this, "onChangeSize");

		supr(this, 'init', [merge(opts, defaults)]);
	};

	this.onChangeWidth = function (width) {
		this.updateOpts({width: width}, true);
	};

	this.onChangeHeight = function (height) {
		this.updateOpts({height: height}, true);
	};

	this.onChangeSize = function (size, ctx) {
		this.updateOpts({size: size}, true);
		if (ctx) {
			ctx.font = this._opts.fontWeight + " " + this._opts.size + "px " + this._opts.fontFamily;
		}
	};

	// These options might have been changed to make the text fit, restore them...
	this._restoreOpts = function () {
		var optsLast = this._optsLast;
		var optsKey;
		var i = savedOpts.length;
		while (i) {
			optsKey = savedOpts[--i];
			if (optsKey in optsLast) {
				this._opts[optsKey] = optsLast[optsKey];
			}
		}
	};

	// Check if the cache should be updated...
	this._checkOpts = function (opts) {
		var optsLast = this._optsLast;
		var optsKey;
		var i = clearCacheKeys.length;

		this._cacheUpdate = this._cacheUpdate || !Object.keys(this._opts).length;
		while (i) {
			optsKey = clearCacheKeys[--i];
			if ((optsKey in opts) && clearCache[optsKey] && (optsLast[optsKey] !== opts[optsKey])) {
				this._cacheUpdate = true;
			}
			if (optsKey in opts) {
				optsLast[optsKey] = opts[optsKey];
			} else if (optsKey in this._opts) {
				optsLast[optsKey] = this._opts[optsKey];
			} else {
				optsLast[optsKey] = defaults[optsKey];
			}
		}
	};

	this._checkDeprecatedOpts = function (opts) {
		opts.allowVerticalSizing = !legacySettings.disableVerticalAutoSize;

		if ("multiline" in opts) {
			if (DEBUG && messageMultiline) {
				console.warn("TextView opts.multiline is deprecated, please use wrap...");
				messageMultiline = false;
			}
			opts.wrap = opts.multiline;
		}
		if ("textAlign" in opts) {
			if (DEBUG && messageTextAlign) {
				console.warn("TextView opts.multiline is deprecated, please use wrap...");
				messageTextAlign = false;
			}
			opts.horizontalAlign = opts.textAlign;
		}
		var font = opts.font;
		if (font) {
			if (DEBUG && messageFont) {
				console.warn("TextView opts.font is deprecated, please use fontFamily and size...");
				messageFont = false;
			}
			while (font.length && (font[0] === ' ')) {
				font = font.substr(1 - font.length);
			}
			var i = font.indexOf(' ');
			if (i !== -1) {
				opts.size = parseInt(font.substr(0, i).replace(/[pxtem\s]/gi, ''), 10);
				opts.fontFamily = font.substr(i + 1 - font.length);
			}
		}
	};

	this.updateOpts = function (opts, dontCheck) {
		this._checkDeprecatedOpts(opts);

		if ("padding" in opts) {
			this.style.padding = new Padding(opts.padding);
		}

		if (!dontCheck) {
			this._restoreOpts();
			this._checkOpts(opts);
			if (this._cacheUpdate) {
				opts.hash = false;
			} else {
				supr(this, 'updateOpts', arguments);
				return;
			}
		}

		opts = supr(this, 'updateOpts', arguments);

		("text" in opts) && this.setText(opts.text);
		!dontCheck && this._textFlow.setOpts(this._opts);

		return opts;
	};

	this._updateCtx = function (ctx) {
		var opts = this._opts;

		ctx.textBaseline = "top";
		ctx.fillStyle = opts.color;
		ctx.font = opts.fontWeight + " " + opts.size + "px " + opts.fontFamily;
		ctx.lineWidth = opts.lineWidth;
	};

	this._renderToCtx = function (ctx, offsetX, offsetY) {
		var opts = this._opts;
		var cache = this._textFlow.getCache();
		var maxWidth = opts.autoFontSize ? this._textFlow.getActualWidth() : 1000000;
		var item;
		var word;
		var color = opts.color;
		var strokeColor = opts.strokeStyle;
		var outlineColor = opts.outlineColor;
		var shadowColor = opts.shadowColor;
		var lineOffset = opts.lineWidth / 2;
		var x, y;
		var i = cache.length;

		if (legacySettings.textViewColor && this.color) {
			color = this.color;
		}

		this._updateCtx(ctx);

		if (strokeColor) {
			ctx.strokeStyle = strokeColor;
		}

		while (i) {
			item = cache[--i];
			word = item.word;
			x = offsetX + item.x;
			y = offsetY + item.y;

			if (strokeColor) {
				ctx.strokeText(word, x, y, maxWidth);
			}
			if (outlineColor) {
				ctx.fillStyle = outlineColor;
				ctx.fillText(word, x - lineOffset, y, maxWidth);
				ctx.fillText(word, x + lineOffset, y, maxWidth);
				ctx.fillText(word, x, y - lineOffset, maxWidth);
				ctx.fillText(word, x, y + lineOffset, maxWidth);
			}
			if (shadowColor) {
				ctx.fillStyle = shadowColor;
				ctx.fillText(word, x + lineOffset, y + lineOffset, maxWidth);
			}

			ctx.fillStyle = color;
			ctx.fillText(word, x, y, maxWidth);
		}
	};

	this._renderBuffer = function (ctx) {
		var opts = this._opts;
		var fonctBufferCtx = fontBuffer.getContext();
		var offsetRect = this._textFlow.getOffsetRect();
		var width = offsetRect.width;
		var height = offsetRect.height;
		var cache = this._textFlow.getCache();
		var desc;

		opts.lineCount = cache[cache.length - 1].line;
		desc = fontBuffer.getPositionForText(opts);
		if (desc != null) {
			this._cacheUpdate && this._renderToCtx(fonctBufferCtx, desc.x - offsetRect.x, desc.y - offsetRect.y);
			ctx.drawImage(fontBuffer.getCanvas(), desc.x, desc.y, width, height, offsetRect.x, offsetRect.y, width, height);
		} else {
			this._opts.buffered = false;
		}
	};

	this.render = function (ctx) {
		var opts = this._opts;

		if (this._cacheUpdate) {
			this._updateCtx(ctx);
			this._textFlow.reflow(ctx, 1 + (opts.autoFontSize ? 4 : 0) + (opts.autoSize ? 2 : 0) + (opts.wrap ? 1 : 0));
		}
		if (!this._textFlow.getCache().length) {
			this._cacheUpdate = false;
			return;
		}

		if (this._opts.buffer && (fontBuffer !== null)) {
			this._renderBuffer(ctx);
		} else {
			this._renderToCtx(ctx, 0, 0);
		}

		this._cacheUpdate = false;
	};

	this.clearBuffers = function() {
		var ctx;

		if (fontBuffer !== null) {
			ctx = fontBuffer.getContext();
			ctx.clear();
			ctx.globalCompositeOperation = "source-over";

			fontBuffer.clearBuffer();
		}
	};

	this.getFontBuffer = function() {
		return fontBuffer;
	};

	this.setText = function (text) {
		this._restoreOpts();
		this._opts.text = (text != undefined) ? text.toString() : '';
		this._cacheUpdate = true;
		this.needsRepaint();
	};

	this.getText = function () {
		return this._opts.text;
	};

	this.getTag = function() {
		return "TextView" + this.uid + ":" + (this._lines && this._lines.join(" ").substring(0, 20));
	};

	this.reflow = function () {
		this._restoreOpts();
		this._cacheUpdate = true;
	};
});

exports.clearBuffers = TextView.prototype.clearBuffers;
exports.getFontBuffer = TextView.prototype.getFontBuffer;
