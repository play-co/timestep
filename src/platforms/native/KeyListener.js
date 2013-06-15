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

exports = Class('timestep.KeyListener', function (logger, supr) {
	this.init = function () {
		this._shortcuts = [];
		this._events = [];
	}


	this.setEnabled = function (isEnabled) { this._isEnabled = isEnabled; }

	this.captureShortcut = function (shortcut) {
		this._shortcuts.push(shortcut);
	}
	
	this.getPressed = function () { return {}; }

	this.onKeyDown = function (e) {
		
	}
	
	this.liftAll = function () {
	}	
	this.onKeyUp = function (e) {
	}
	
	this.onKeyPress = function (e) {
	}
	
	this.peekEvents = function () { return this._events; }
	this.popEvents = function () { return this._events.splice(0, this._events.length); }
});

