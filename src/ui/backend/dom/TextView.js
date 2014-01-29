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
 * @package ui.backend.dom.TextView;
 *
 * TextView implementation for DOM.
 */

import ui.View as View;
import device;

/**
 * @extends ui.View
 */
exports = Class(View, function (supr) {

	this._displayStyle = "table";

	var defaults = {
		// layout properties...
		wrap: false,
		autoSize: false,
		autoFontSize: true,
		verticalPadding: 0,
		horizontalPadding: 0,
		lineHeight: 1.2,

		// font properties...
		color: "#000000",
		fontFamily: device.defaultFontFamily,
		fontWeight: "",
		size: 128,
		lineWidth: 2,
		strokeColor: null,
		shadowColor: null,

		// alignment properties...
		verticalAlign: "middle",
		horizontalAlign: "center",

		// misc properties...
		backgroundColor: null
	};

	this.init = function (opts) {
		var el = this._textNode = document.createElement("div");
		el.className = 'view text';
		// el.style.position = 'relative';

		supr(this, "init", [merge(opts, defaults)]);

		this.__view.getElement().appendChild(el);
	};

	this.updateOpts = function (opts) {
		opts = supr(this, "updateOpts", arguments);

		var s = this.__view.getElement().style;

		if (opts.horizontalPadding) {
			if (isArray(opts.horizontalPadding)) {
				s.paddingLeft = opts.horizontalPadding[0] + "px";
				s.paddingRight = opts.horizontalPadding[0] + "px";
			} else {
				s.paddingLeft = opts.horizontalPadding + "px";
				s.paddingRight = opts.horizontalPadding + "px";
			}
		}

		if (opts.verticalPadding) {
			if (isArray(opts.verticalPadding)) {
				s.paddingTop = opts.verticalPadding[0] + "px";
				s.paddingBottom = opts.verticalPadding[0] + "px";
			} else {
				s.paddingTop = opts.verticalPadding + "px";
				s.paddingBottom = opts.verticalPadding + "px";
			}
		}

		if (opts.color)           { s.color = opts.color; }
		if (opts.size)            { this._fontSize = opts.size; }
		if (opts.fontFamily)      { s.fontFamily = opts.fontFamily; }
		if (opts.horizontalAlign) { s.textAlign = opts.horizontalAlign; }
		if (opts.verticalAlign)   { this._verticalAlign = opts.verticalAlign; }
		if (opts.fontWeight)      { s.fontWeight = opts.fontWeight; }
		if (opts.shadowColor)     { s.textShadow = opts.shadowColor + " 2px 2px 1px"; }
		if (opts.lineHeight)      { s.lineHeight = opts.lineHeight * opts.size + 'px'; }
		if (opts.strokeColor)     { this._updateStroke(); }
		if (!opts.wrap)           { s.whiteSpace = "nowrap"; }

		// s.display = 'table';

		this.setText(opts.text || "");
	};

	this.getText = function () { return this._text; }

	var TOLERANCE = 1;

	this.reflow = function () {
		var opts = this._opts;
		var node = this._textNode;
		if (node) {
			if (opts.autoSize) {
				var idealHeight = node.scrollHeight;
				if (!this.style.height || this.style.height < idealHeight) {
					this.style.height = idealHeight;
				}
			}

			// use binary-search to fit text into dom node
			if (opts.autoFontSize) {
				var step, size;
				step = size = this._fontSize;

				if (!opts.wrap) {
					// fit width
					do {
						var currentWidth = node.scrollWidth;
						var diff = currentWidth - this.style.width;
						if (diff > TOLERANCE) {
							size -= (step /= 2);
							node.style.fontSize = size + 'px';
							continue;
						}
					} while (false);
				}

				// fit height
				do {
					var currentHeight = node.scrollHeight;
					var diff = currentHeight - this.style.height;
					if (diff > TOLERANCE) {
						size -= (step /= 2);
						node.style.fontSize = size + 'px';
						continue;
					}
				} while (false);

				this._computedFontSize = size;
				node.style.lineHeight = opts.lineHeight * size + 'px';
			}

			this._computeVerticalAlign();

			if (this._strokeNode) {
				this._strokeNode.style.width = this._fillNode.offsetWidth + 'px';
			}
		}
	};

	this.setText = function (text) {
		if (typeof text == "function") {
			return text(this);
		}

		text = text != undefined ? text.toString() : '';

		if (this._text != text) {
			this._text = text;

			if (this._strokeNode) {
				this._fillNode.innerText = text;
				this._strokeNode.innerText = text;
			} else {
				this._textNode.innerText = text;
			}

			this._textNode.style.fontSize = this._fontSize + 'px';
			this.needsReflow();
		}
	};

	this._computeVerticalAlign = function () {
		var s = this._textNode.style;
		var opts = this._opts;
		var fontSize = this._computedFontSize || this._fontSize;
		var lineSize = opts.lineHeight * fontSize;
		var numLines = Math.round(this._textNode.offsetHeight / lineSize);

		var padding = this.style.padding;
		var offset = padding.top;
		if (opts.verticalAlign == 'middle') {
			offset += (this.style.height
						- padding.top
						- padding.bottom
						- (numLines > 1 ? opts.lineHeight * numLines : 1) * fontSize) / 2;
		}

		this._textNode.style.marginTop = offset + 'px';
	};

	this._updateStroke = function () {
		var opts = this._opts;
		if (opts.strokeColor && opts.strokeWidth) {
			if (!this._strokeNode) {
				this._textNode.innerHTML = '<span style="position:relative"><span></span><span style="position:absolute;left:0;top:1px;right:0px;z-index:-1"></span></span>';
				this._fillNode = this._textNode.childNodes[0].childNodes[0];
				this._strokeNode = this._textNode.childNodes[0].childNodes[1];
			}

			// this._strokeNode.style.left = -opts.strokeWidth / 2 + 'px';
			this._strokeNode.style.webkitTextStroke = (opts.strokeWidth * 1) + "px " + opts.strokeColor;
			this.needsReflow();
		} else if (this._strokeNode) {
			this._strokeNode = null;
			this._fillNode = null;
			this.setText(this._text);
		}
	}
});
