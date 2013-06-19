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

import math.geom.Vec2D as Vec2D;

exports = Class(View, function (supr) {
	this.init = function (opts) {
		opts.blockEvents = false;

		supr(this, 'init', [opts]);

		this._dragMagnitude = opts.dragMagnitude || 150;
		this._dragTime = opts.dragTime || 250;
	};

	this.onInputStart = function (evt) {
		this.emit('Click', {x: evt.srcPt.x / GC.app.scale, y: evt.srcPt.y / GC.app.scale})

		this.startDrag();
		this.emit('Start');
	};

	this.onDragStart = function (dragEvent) {
		this._dragStartTime = Date.now();
		this._dragStartPoint = dragEvent.srcPoint;
	};

	this.onInputMove = function (evt, pt) {
		this.emit('Move', pt);
	};

	this.onDrag = function (dragEvent, moveEvent, delta) {
		if ((delta.y < -1 && this._dragDY >= 0) || (delta.y > 1 && this._dragDY <= 0)) {
			this._dragStartTime = this._totalTime;
			this._dragStartPoint = dragEvent.srcPoint;
			this._dragDY = delta.y;
		}
	};

	this.onDragStop = function (dragEvent, selectEvent) {
		var dY = this._dragStartPoint.y - selectEvent.srcPoint.y;
		var dX = this._dragStartPoint.x - selectEvent.srcPoint.x;
		var dragVec = new Vec2D({x: dX, y: dY});
		var mag = dragVec.getMagnitude();
		var dt = Date.now() - this._dragStartTime;

		if ((mag > this._dragMagnitude) && (dt < this._dragTime)) {
			var angle = dragVec.getAngle();
			var degrees = angle * (180 / Math.PI);
			var isUp = degrees > 60 && degrees < 120;
			var isDown = degrees < -60 && degrees > -120;
			var isRight = degrees > 120 || degrees < -120;
			var isLeft = degrees < 60 || degrees > -60;

			this.emit('Drag', angle);

			// Turned off for internal release
			if (isUp) {
				this.emit('DragUp');
			} else if (isDown) {
				this.emit('DragDown');
			} else if (isRight) {
				this.emit('DragRight');
			} else if (isLeft) {
				this.emit('DragLeft');
			}
		}
	};
});