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
 * package timestep.env.browser.KeyListener;
 *
 * Listen to pressed keys and expose them using a altogether too public API.
 * An independent KeyListener is exposed for the Application Engine and any
 * Views with a Focus Manager.
 */

import lib.PubSub as PubSub;
import lib.Enum;

import event.input.keys as keyConstants;
import device;
import timer;

from util.browser import $;

var gListenerSingleton = null;
var gCancelKeys = lib.Enum(keyConstants.SPACE, keyConstants.LEFT, keyConstants.RIGHT, keyConstants.UP, keyConstants.DOWN);

exports = Class(function () {
	this.init = function (el, events) {
		if (gListenerSingleton) { return gListenerSingleton; }
		gListenerSingleton = this;
		
		this._el = el = el || document;
		this._events = [];
		this._shortcuts = [];
		this._isEnabled = true;
		this._keyMap = {};
		
		$.onEvent(el, 'keydown', this, 'onKeyDown');
		$.onEvent(el, 'keypress', this, 'onKeyPress');
		$.onEvent(el, 'keyup', this, 'onKeyUp');
		$.onEvent(window, 'blur', this, 'liftAll');
	}
	
	this.setEnabled = function (isEnabled) { this._isEnabled = isEnabled; }

	this.captureShortcut = function (shortcut) {
		this._shortcuts.push(shortcut);
	}
	
	this.getPressed = function () { return this._keyMap; }

	this.onKeyDown = function (e) {
		
		if (!this._isEnabled) { return; }
		
		var evt = {
			code: e.keyCode,
			ctrl: e.ctrlKey,
			shift: e.shiftKey,
			alt: e.altKey,
			meta: e.metaKey, // for mac keyboards
			lifted: false,
			dt: timer.getTickProgress()
		};
		
		if (evt.ctrl || evt.shift || evt.alt || evt.meta) {
			var captured = false;
			for (var i = 0, s; s = this._shortcuts[i]; ++i) {
				if (s.compare(evt)) {
					s.publish('Down', evt);
					captured = true;
				}
			}
			
			if (captured) { $.stopEvent(e); }
			return;
		} else {
			// MUST cancel event if we're enabled to prevent browser
			// default behaviors (e.g. scrolling)
			$.stopEvent(e);
		}
		
		// We already know that key is down; ignore repeat events.
		if (e.keyCode in this._keyMap) { return; }
		
		this._events.push(evt);
		this._keyMap[e.keyCode] = +new Date();
	}
	
	this.liftAll = function () {
		var progressDt = timer.getTickProgress();
		for (var code in this._keyMap) {
			this._events.push({
				code: code,
				lifted: true,
				dt: progressDt
			});
		}
		this._keyMap = {};
	}
	
	this.onKeyUp = function (e) {
		var progressDt = timer.getTickProgress();
		delete this._keyMap[e.keyCode];
		this._events.push({
			code: e.keyCode,
			lifted: true,
			dt: progressDt
		});
		$.stopEvent(e);
	}
	
	this.onKeyPress = function (e) {
		if (!this._isEnabled) { return; }
		if (e.keyCode in gCancelKeys) {
			$.stopEvent(e);
		}
	}
	
	this.peekEvents = function () { return this._events; }
	this.popEvents = function () { return this._events.splice(0, this._events.length); }
});

// TODO: for maximum compatibility, especially with foreign keyboards, this needs to be inferred from the browser.  I think we can rely on a single DOM key event to get the constants in most browsers.
merge(exports.prototype, keyConstants);

exports.Shortcut = Class(PubSub, function () {
	this.init = function (keyCode, ctrl, shift, alt, meta) {
		this.ctrl = !!ctrl;
		this.shift = !!shift;
		this.alt = !!alt;
		this.meta = !!meta;
		this.code = !!keyCode;
	}
	
	this.compare = function (shortcut) {
		return this.ctrl == shortcut.ctrl 
			&& this.alt == shortcut.alt
			&& this.meta == shortcut.meta
			&& this.shift == shortcut.shift
			&& this.code == shortcut.code;
	}
});
