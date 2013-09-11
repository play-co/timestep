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

import ui.ImageScaleView as ImageScaleView;
import ui.resource.Image as Image;

exports = Class(ImageScaleView, function (supr) {

	this.init = function (opts) {
		this._minValue = ("minValue" in opts) ? opts.minValue : 0;
		this._maxValue = ("maxValue" in opts) ? opts.maxValue : 100;
		this._thumbSize = opts.thumbSize || "auto";
		this._active = ("active" in opts) ? opts.active : true;
		this._increment = ("increment" in opts) ? opts.increment : false;

		opts = merge(opts, opts.track);
		supr(this, "init", [opts]);

		this._value = Math.max(Math.min(opts.value || 0, this._maxValue), this._minValue);

		this.updateOpts(opts);
	};

	this._initThumb = function (opts) {
		var thumb = merge({
				superview: this
			}, opts.thumb);

		if (!thumb.pressed) {
			thumb.pressed = thumb.active;
		}
		if (!thumb.inactive) {
			thumb.inactive = thumb.active;
		}

		this._thumbActiveImage = (thumb.active instanceof Image) ? thumb.active : new Image({url: thumb.active || ""});
		this._thumbPressedImage = (thumb.pressed instanceof Image) ? thumb.pressed : new Image({url: thumb.pressed || ""});
		this._thumbInactiveImage = (thumb.inactive instanceof Image) ? thumb.inactive : new Image({url: thumb.inactive || ""});

		thumb.inactive = thumb.inactive || thumb.active;

		this._thumb = new ImageScaleView(thumb);
	};

	this.updateOpts = function (opts) { // This method updates all options which don't have a setter in this class!
		opts = merge(opts, opts.track);

		supr(this, "updateOpts", [opts]);

		var track = opts.track || {};
		if (!track.inactive) {
			track.inactive = track.active;
		}
		this._activeImage = (track.active instanceof Image) ? track.active : new Image({url: track.active || ""});
		this._inactiveImage = (track.inactive instanceof Image) ? track.inactive : new Image({url: track.inactive || ""});

		this._initThumb(opts);
		this._updateStyle();

		return opts;
	};

	this._updateStyle = function () {
		var opts = this._opts;
		var active = this._active;

		if ("activeColor" in opts) {
			this.style.backgroundColor = active ? opts.activeColor : opts.inactiveColor;
			this._thumb.style.backgroundColor = active ? opts.thumb.activeColor : opts.thumb.inactiveColor;
		} else {
			this._thumb.setImage(active ? this._thumbActiveImage : this._thumbInactiveImage);
			this.setImage(active ? this._activeImage : this._inactiveImage);
		}
	};

	this._publicValue = function () { // The value which will be published, depends on increment...
		if (this._increment === false) {
			return this._value;
		}
		return Math.round(this._value / this._increment) * this._increment;
	};

	this._valueFromThumbPosition = function (pos) {
		var fields = this._fields; // Which fields to use, based on orientation...
		var padding = this.style.padding;
		var padSize = padding[fields.padSize]();
		var padPos = padding[fields.padPos];
		var size = this.style[this._fields.size];

		pos = (pos == undefined) ? this._thumb.style[this._fields.pos] : pos;

		return this._minValue + (pos - padPos) / (size - padSize - this._thumbLength) * (this._maxValue - this._minValue);
	};

	this._positionFromPoint = function (pt) {
		var fields = this._fields; // Which fields to use, based on orientation...
		var padding = this.style.padding;
		var padSize = padding[fields.padSize]();
		var padPos = padding[fields.padPos];
		var pos = pt[fields.pos] - (this._thumbLength / 2 + padPos);
		var max = this.style[fields.size] - (padSize + this._thumbLength);

		return padPos + Math.min(Math.max(pos, 0), max);
	};

	this.onInputStart = function (event, pt) {
		if (this._active) {
			var endPos = this._positionFromPoint(pt);
			var pos = {};

			pos[this._fields.pos] = endPos;

			this._value = this._valueFromThumbPosition(endPos);
			this.publish("Change", this._publicValue(this._value));

			if ("pressedColor" in this._opts.thumb) {
				this._thumb.style.backgroundColor = this._opts.thumb.pressedColor;
			} else {
				this._thumb.setImage(this._thumbPressedImage);
			}
			this._thumb.getAnimation().now(pos, 100);

			this.startDrag();
		}
	};

	this.onDrag = function (dragEvt, moveEvt) {
		if (this._active && moveEvt.point[this.uid]) {
			this._thumb.style[this._fields.pos] = this._positionFromPoint(moveEvt.point[this.uid]);
			this._value = this._valueFromThumbPosition();
			this.publish("Change", this._publicValue(this._value));
		}
	};

	this.onDragStop = function (event) {
		this._updateStyle();
	};

	this.onInputSelect = function (event, pt) {
		if (this._active) {
			this._updateStyle();
			this._thumb.style[this._fields.pos] = this._positionFromPoint(pt);
			this._value = this._valueFromThumbPosition();
			this.publish("Change", this._publicValue(this._value));
		}
	};

	this.setValue = function (value) {
		this._value = Math.max(Math.min(value, this._maxValue), this._minValue);

		var fields = this._fields;
		var padding = this.style.padding;
		var padSize = padding[fields.padSize]();
		var padPos = padding[fields.padPos];
		var minValue = this._minValue;
		var maxValue = this._maxValue;
		var range = maxValue - minValue;

		var pos = {};
		pos[this._fields.pos] = padPos + ((this._value - minValue) / range) * (this.style[this._fields.size] - this._thumbLength - padSize);
		this._thumb.getAnimation().now(pos, 100);

		this.publish("Change", this._publicValue(this._value));
	};

	this.getValue = function () {
		return this._publicValue(this._value);
	};

	this.setIncrement = function (increment) {
		this._increment = increment;
		this.publish("Change", this._publicValue(this._value));
	};

	this.setMinValue = function (minValue) {
		this._minValue = minValue;
		this.setValue(this._value);
	};

	this.setMaxValue = function (maxValue) {
		this._maxValue = maxValue;
		this.setValue(this._value);
	};

	this.setThumbSize = function (thumbSize) {
		this._thumbSize = thumbSize;
		this.reflow();
	};

	this.setActive = function (active) {
		this._active = active;
		this._updateStyle();
	};

	this.reflow = function () {
		var thumbStyle = this._thumb.style;
		var style = this.style;
		var thumbThickness;

		this._isHorizontal = ("horizontal" in this._opts) ? this._opts.horizontal : (style.width > style.height);

		if (this._isHorizontal) {
			this._fields = {pos: "x", size: "width", padPos: "left", padSize: "getHorizontal"};
			thumbThickness = style.height - style.padding.getVertical();
			this._thumbLength = (this._thumbSize === "auto") ? thumbThickness : this._thumbSize;
			thumbStyle.y = style.padding.top;
			thumbStyle.width = this._thumbLength;
			thumbStyle.height = thumbThickness;
		} else {
			this._fields = {pos: "y", size: "height", padPos: "top", padSize: "getVertical"};
			thumbThickness = style.width - style.padding.getHorizontal();
			this._thumbLength = (this._thumbSize === "auto") ? thumbThickness : this._thumbSize;
			thumbStyle.x = style.padding.left;
			thumbStyle.width = thumbThickness;
			thumbStyle.height = this._thumbLength;
		}

		this.setValue(this._value);
	};
});
