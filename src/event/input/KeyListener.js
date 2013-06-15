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
 * @class event.input.KeyListener
 * Implements a simple Key listener.
 */

jsio('from util.browser import $');

var listener = null;

exports = Class(function () {
	this.init = function () {
		if (!listener) {
			listener = new Listener();
		}
	}
	this.getKeys = function () {
		return listener.getKeys();
	}
});

var Listener = Class(function () {
	this.init = function (el, events) {
		this._el = el = el || document;
		this._keys = {};

		$.onEvent(el, 'keydown', this, 'onKeyDown');
		//$.onEvent(el, 'click', this, 'click');
		$.onEvent(el, 'keyup', this, 'onKeyUp');
		$.onEvent(el, 'blur', this, 'clear');
	};


	this.onKeyUp = function (e) {
		this._keys[e.keyCode] = false;
		delete this._keys[e.keyCode];
		$.stopEvent(e);
	};
	
	this.onKeyDown = function (e) {
		this._keys[e.keyCode] = true;
		$.stopEvent(e);
	};

	this.getKeys = function () {
		return this._keys;
	};
});
