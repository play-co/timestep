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
 * package ui.backend.canvas.TextView;
 *
 * canvas.TextView implementation.
 */

import ui.View as View;
import ui.resource.Image as Image;
import ui.layout.Padding as Padding;
import device;
import .util.FragmentBuffer as FragmentBuffer;
import .TextFlow;

import ...legacySettings as legacySettings;

var messageFont = true; // Report first font error message

var textViewID = 1;

/**
 * @extends ui.View
 */
var TextView = exports = Class(View, function (supr) {

	var DEPRECATED = {
		multiline: { replacement: "wrap" },
		textAlign: { replacement: "horizontalAlign" },
		lineWidth: { replacement: "strokeWidth" },
		strokeStyle: { replacement: "strokeColor" },
		outlineColor: { replacement: "strokeColor" }
	};

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
		fontWeight: device.defaultFontWeight,
		size: 128,
		strokeWidth: 2,
		shadowWidth: 2,
		strokeColor: null,
		shadowColor: null,

		// alignment properties...
		verticalAlign: "middle",
		horizontalAlign: "center",

		// misc properties...
		buffer: false, // GLOBAL.NATIVE && !device.simulatingMobileNative,
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
		strokeWidth: true,
		shadowWidth: true,
		strokeColor: false,
		shadowColor: false,

		// alignment properties...
		verticalAlign: true,
		horizontalAlign: true,

		// misc properties...
		backgroundColor: false,
		text: true
	};
	var clearCacheKeys = Object.keys(clearCache);

	var hashItems = {
		// font properties...
		color: true,
		fontFamily: true,
		fontWeight: true,
		size: true,
		strokeWidth: true,
		shadowWidth: true,
		strokeColor: false,
		shadowColor: false,

		// misc properties...
		backgroundColor: true,
		text: true
	};
	var hashItemsKeys = Object.keys(hashItems);

	var savedOpts = [
		"width",
		"height",
		"size"
	];

	var fontBuffer = new FragmentBuffer();

	fontBuffer.onGetHash = function (desc) {
		return desc.textView.getHash();
	};

	this.init = function (opts) {
		this._opts = {};
		this._optsLast = {};
		this.updateCache();

		this._textFlow = new TextFlow({target: this});
		this._textFlow.subscribe("ChangeWidth", this, "onChangeWidth");
		this._textFlow.subscribe("ChangeHeight", this, "onChangeHeight");
		this._textFlow.subscribe("ChangeSize", this, "onChangeSize");

		supr(this, 'init', [merge(opts, defaults)]);

		this._id = textViewID++;
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
		if (this._cacheUpdate) {
			this._hash = false;
		}
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
		for (var k in DEPRECATED) {
			if (k in opts) {
				var dep = DEPRECATED[k];
				if (DEBUG && !dep.hasWarned) {
					console.warn("TextView opts." + k + " is deprecated, please use " + dep.replacement + "...");
					dep.hasWarned = true;
				}
				opts[dep.replacement] = opts[k];
			}
		}
		var font = opts.font;
		if (font) {
			if (DEBUG && messageFont) {
				console.warn("TextView opts.font is deprecated, please use fontFamily and size...");
				messageFont = false;
			}
			while (font.length && (font[0] === " ")) {
				font = font.substr(1 - font.length);
			}
			var i = font.indexOf(' ');
			if (i !== -1) {
				opts.size = parseInt(font.substr(0, i).replace(/[pxtem\s]/gi, ""), 10);
				opts.fontFamily = font.substr(i + 1 - font.length);
			}
		}
	};

	this.updateCache = function () {
		this._cacheUpdate = true;
		this._hash = false;
	};

	this.updateOpts = function (opts, dontCheck) {
		// update emoticon data
		if (opts.emoticonData) {
			for (var key in opts.emoticonData.data) {
				var data = opts.emoticonData.data[key];
				if (!data.image) {
					data.image = new Image({url: data.url});
				}
			}
		}

		if (this._opts.buffer) {
			fontBuffer.releaseBin(this.getHash());
		}
		this.updateCache();

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
				supr(this, "updateOpts", arguments);
				return;
			}
		}

		opts = supr(this, "updateOpts", arguments);

		("text" in opts) && this.setText(opts.text);
		!dontCheck && this._textFlow.setOpts(this._opts);

		return opts;
	};

	this._updateCtx = function (ctx) {
		var opts = this._opts;

		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillStyle = opts.color;
		ctx.font = opts.fontWeight + " " + opts.size + "px " + opts.fontFamily;
		ctx.lineWidth = this.getStrokeWidth();
	};

	this._renderToCtx = function (ctx, offsetX, offsetY) {
		var opts = this._opts;
		var words = this._textFlow.getWords();
		var maxWidth = opts.autoFontSize ? this._textFlow.getAvailableWidth() : 1000000;
		var item;
		var word;
		var color = opts.color;
		var strokeColor = opts.strokeColor;
		var shadowColor = opts.shadowColor;
		var lineOffset = this.getStrokeWidth() / 2;
		var x, y;
		var i = words.length;

		if (legacySettings.textViewColor && this.color) {
			color = this.color;
		}

		this._updateCtx(ctx);

		if (strokeColor) {
			ctx.strokeStyle = strokeColor;
		}

		while (i) {
			item = words[--i];
			word = item.word;

			x = offsetX + item.x;
			y = offsetY + item.y;

			var emoticonData = (word[0] == '(') && opts.emoticonData && opts.emoticonData.data[word];
			if (emoticonData) {
				//ctx.fillStyle = color;
				//ctx.fillRect(x + lineOffset, y + lineOffset, opts.size, opts.size);
				if (emoticonData.image) {
					emoticonData.image.render(ctx, x + lineOffset, y + lineOffset, opts.size, opts.size);
				}

			} else {
				if (strokeColor) {
					ctx.strokeText(word, x + lineOffset, y + lineOffset, maxWidth);
				}
				if (shadowColor) {
					var shadowOffset = this._opts.shadowWidth || 0;
					ctx.fillStyle = shadowColor;
					ctx.fillText(word, x + lineOffset + shadowOffset, y + lineOffset + shadowOffset, maxWidth);
				}

				ctx.fillStyle = color;
				ctx.fillText(word, x + lineOffset, y + lineOffset, maxWidth);
			}
		}
		if (this._opts.debug) {
			ctx.strokeStyle = 'black';
			ctx.strokeRect(x, y, item.width, this.style.height - 2 * y);
			ctx.strokeStyle = 'red';
			ctx.strokeRect(0, 0, this.style.width, this.style.height);
		}
	};

	this._renderBuffer = function (ctx) {
		var fontBufferCtx = fontBuffer.getContext();
		var offsetRect = this._textFlow.getOffsetRect();
		var width = offsetRect.width;
		var height = offsetRect.height;
		var words = this._textFlow.getWords();
		var desc;

		if (width && height) {
			this._opts.lineCount = words[words.length - 1].line;
			offsetRect.text = this._opts.text;
			offsetRect.textView = this;
			// When we support clearing offscreen buffers then this line can be activated instead of the next one...
			// desc = fontBuffer.getPositionForText(offsetRect) || fontBuffer.getPositionForText(offsetRect);
			desc = fontBuffer.getPositionForText(offsetRect);
			if (desc != null) {
				if (this._cacheUpdate) {
					fontBufferCtx.clearRect(desc.x, desc.y, desc.width, desc.height);
					this._renderToCtx(fontBufferCtx, desc.x - offsetRect.x, desc.y - offsetRect.y);
				}
				ctx.drawImage(fontBuffer.getCanvas(), desc.x, desc.y, width, height, offsetRect.x, offsetRect.y, width, height);
			} else {
				this._opts.buffer = false;
			}
		}
	};

	this.computeSize = function (ctx) {
		if (this._cacheUpdate) {
			this._updateCtx(ctx);
			var opts = this._opts;
			this._textFlow.reflow(ctx, 1 + (opts.autoFontSize ? 4 : 0) + (opts.autoSize ? 2 : 0) + (opts.wrap ? 1 : 0));
		}
	}

	this.render = function (ctx) {
		this.computeSize(ctx);
		if (!this._textFlow.getWords().length) {
			this._cacheUpdate = false;
			return;
		}

		if (this._opts.buffer) {
			this._renderBuffer(ctx);
		} else {
			var strokeWidthOffset = -this.getStrokeWidth()/2;
			this._renderToCtx(ctx, strokeWidthOffset, strokeWidthOffset);
		}

		this._cacheUpdate = false;
	};

	this.clearBuffers = function () {
		fontBuffer.clearBuffer();
	};

	this.getFontBuffer = function () {
		return fontBuffer;
	};

	this.setText = function (textData) {
		var text = (textData != undefined) ? textData.toString() : "";

		var emoticonData = this._opts.emoticonData;
		if (emoticonData) {
			for (var key in emoticonData.map) {
				var re = new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
				text = text.replace(re, emoticonData.map[key]);
			}
		}

		if (this._opts.text !== text) {
			if (this._opts.buffer) {
				fontBuffer.releaseBin(this.getHash());
			}

			this._restoreOpts();
			this._opts.text = text;
			this.updateCache();
			this.needsRepaint();
		}
	};

	this.getStrokeWidth = function () {
		return this._opts.strokeColor ? this._opts.strokeWidth : 0;
	};

	this.getText = function () {
		return this._opts.text;
	};

	this.getTag = function () {
		return "TextView" + this.uid + ":" + (this.tag || (this._opts.text || "").substring(0, 20));
	};

	this.getOpts = function () {
		return this._opts;
	};

	this.getHash = function () {
		if (!this._hash) {
			this._hash = "";

			var opts = this._opts;
			var i = hashItemsKeys.length;
			while (i) {
				this._hash += opts[hashItemsKeys[--i]];
			}
		}
		return this._hash;

		// When we support clearing offscreen buffers we can use this instead of the code above...
		// return 't' + this._id;
	};

	this.reflow = function () {
		this._restoreOpts();
		this._cacheUpdate = true;
	};
});

exports.clearBuffers = TextView.prototype.clearBuffers;
exports.getFontBuffer = TextView.prototype.getFontBuffer;
