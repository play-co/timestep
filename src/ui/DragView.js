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
import ui.View as View;

exports = Class(View, function(supr) {
	this.init = function (opts) {
		this._dragRadius = opts.dragRadius || 10;
		this._dragOffset = {};
		supr(this, 'init', [opts]);
	};

	this.onInputStart = function (evt) {
		this.startDrag({
			inputStartEvt: evt,
			radius: this._dragRadius
		});
	};

	this.onDragStart = function (dragEvt) {
		this._dragOffset.x = dragEvt.srcPt.x - this.style.x;
		this._dragOffset.y = dragEvt.srcPt.y - this.style.y;
	};

	this.onDrag = this.onDragStop = function (startEvt, dragEvt, delta) {
		this.style.x = dragEvt.srcPt.x - this._dragOffset.x;
		this.style.y = dragEvt.srcPt.y - this._dragOffset.y;
	};
});