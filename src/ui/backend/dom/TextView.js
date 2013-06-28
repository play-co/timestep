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
		wrap: true,
		autoSize: true,
		autoFontSize: true,
		verticalPadding: 0,
		horizontalPadding: 0,
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

	this.init = function (opts) {
		supr(this, "init", [merge(opts, defaults)]);
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
		if (opts.size)            { s.fontSize = opts.size + "px"; }
		if (opts.fontFamily)      { s.fontFamily = opts.fontFamily; }
		if (opts.horizontalAlign) { s.textAlign = opts.horizontalAlign; }
		if (opts.fontWeight)      { s.fontWeight = opts.fontWeight; }
		if (opts.shadowColor)     { s.textShadow = opts.shadowColor + " 2px 2px 1px"; }
		if (opts.outlineColor)    { s.webkitTextStroke = opts.lineWidth + "px " + opts.outlineColor; }
		if (!opts.wrap)           { s.whiteSpace = "nowrap"; }

		s.display = "table";

		if ("text" in opts) this.setText(opts.text);
	};

	this.getText = function () {
		return this.__view.getElement().getElementsByTagName("span")[0].innerHTML;
	}

	this.reflow = function () {
		if (this._textNode && this._opts.autoSize) {
			var idealHeight = this._textNode.scrollHeight;
			if (!this.style.height || this.style.height < idealHeight) {
				this.style.height = idealHeight;
			}
		}
	};

	this.setText = function (text) {
		if (typeof text == "function") {
			return text(this);
		}

		if (this._text != text) {
			this._text = text;
			var n = this._textNode || document.createElement("span");
			if (!this._textNode) {
				this._textNode = n;
				this.__view.getElement().appendChild(n);
				n.className = "text";
				n.style.display = "table-cell";
				n.style.verticalAlign = this._opts.verticalAlign || "middle";
			}
			this._textNode.innerText = text || "";
			this.needsReflow();
		}
	};
});
