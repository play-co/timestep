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

exports = Class(function () {
	var T = NATIVE.textbox;
	var SLICE = Array.prototype.slice;
	
	var defaults = {
		x: 0,
		y: 0,
		width: 100,
		height: 30,
		text: "",
		color: "white"
	};	
	this.init = function (opts) {
		logger.log("in init");
		opts = merge(opts, defaults);
		logger.log('making a textbox with opts', JSON.stringify(opts));
		this._id = T.create(opts.x, opts.y, opts.width, opts.height, opts.text);
	}
	
	var methods = ['destroy', 'show', 'hide', 'setValue', 'setOpacity', 'setType', 'setVisible',
		'getX', 'getY', 'getWidth', 'getHeight', 'getValue', 'getOpacity', 'getType', 'getVisible'];
	
	for (var i = 0, m; m = methods[i]; ++i) {
		bind(this, function (m) {
			// getters return the value, setters return this
			if (/^get/.test(m)) {
				this[m] = function () { return T[m].apply(T, [this._id].concat(SLICE.call(arguments, 0))); };
			} else {
				this[m] = function () { T[m].apply(T, [this._id].concat(SLICE.call(arguments, 0))); return this; };
			}
		})(m);
	}
	
	this.setPosition = function (p) { T.setPosition(this._id, p.x, p.y); return this; }
	this.getPosition = function () { return {x: this.getX(), y: this.getY()}; }
	
	this.setDimensions = function (d) { T.setDimensions(this._id, d.width, d.height); return this; }
	this.getDimensions = function () { return {width: this.getWidth(), height: this.getHeight()}; }

	this.setApp = function () {}

	this.setOpacity = function (opacity) {
		T.setOpacity(this._id, opacity);
	}

	this.setVisible = function (isVisible) {
		if (isVisible) {
			T.show(this._id); 
		} else {
			T.hide(this._id);
		}
	}

	this.setValue = function (text) {
		T.setValue(this._id, text);
	}
});
