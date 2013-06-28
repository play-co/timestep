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
		supr(this, 'init', [opts]);
		this._swipeMagnitude = opts.swipeMagnitude || 150;
		this._swipeTime = opts.swipeTime || 250;
		this._fingerOne = null;
		this._fingerTwo = null;
		this._initialDistance = null;
		this._initialAngle = null;
		this._dragPoints = {};
		this._activeFingers = 0;
		this._swipeCount = 0;
	};

	this.onInputStart = function (evt) {
		this._activeFingers += 1;
		this._swipeCount = this._activeFingers;
		this.startDrag({ inputStartEvt: evt });
		this.emit('FingerDown', this._activeFingers);
	};

	this.onDragStart = function (dragEvent) {
		var point = {x: dragEvent.srcPoint.x, y: dragEvent.srcPoint.y};
		var id = 'p' + dragEvent.id;
		this._dragPoints[id] = point;
		if (this._fingerOne == null) {
			this._fingerOne = id;
		} else if (this._fingerTwo == null && this._fingerOne != id) {
			this._fingerTwo = id;
		}
	};

	this.clearInput = this.onInputSelect = function (evt) {
		var id = 'p' + evt.id;
		delete this._dragPoints[id];
		this._activeFingers -= 1;
		var initialFingerTwo = this._fingerTwo;
		if (this._fingerOne == id) {
			this._fingerOne = this._fingerTwo;
			this._fingerTwo = null;
		} else if (this._fingerTwo == id) {
			this._fingerTwo = null;
		}
		if (initialFingerTwo && ! this._fingerTwo) {
			this._initialDistance = null;
			this._initialAngle = null;
			this.emit('ClearMulti');
			for (var k in this._dragPoints) {
				if (k != this._fingerOne) {
					this._fingerTwo = k;
					break;
				}
			}
		}
		this.emit('FingerUp', this._activeFingers);
	};

	this.onDrag = function (dragEvent, moveEvent, delta) {
		var id = 'p' + dragEvent.id;
		this._dragPoints[id] = {x: moveEvent.srcPoint.x, y: moveEvent.srcPoint.y};
		if (this._fingerTwo && (this._fingerOne == id || this._fingerTwo == id)) {
			var p1 = this._dragPoints[this._fingerOne];
			var p2 = this._dragPoints[this._fingerTwo];
			var dx = p2.x - p1.x;
			var dy = p2.y - p1.y;
			var d = Math.sqrt(dx * dx + dy * dy);
			var dragVec = new Vec2D({x: dx, y: dy});
			var angle = dragVec.getAngle();
			if (this._initialDistance == null) {
				this._initialDistance = d;
				this._initialAngle = angle;
			} else {
				this.emit('Pinch', d / this._initialDistance);
				this.emit('Rotate', angle - this._initialAngle);
			}
		}
		if (this._fingerOne == id) {
			this.emit('DragSingle', delta.x, delta.y);
		}
	};

	this.onDragStop = function (dragEvent, selectEvent) {
		var dy = dragEvent.srcPoint.y - selectEvent.srcPoint.y;
		var dx = dragEvent.srcPoint.x - selectEvent.srcPoint.x;
		var swipeVec = new Vec2D({x: dx, y: dy});
		var mag = swipeVec.getMagnitude();
		var dt = selectEvent.when - dragEvent.when;
		if ((mag > this._swipeMagnitude) && (dt < this._swipeTime)) {
			var degrees = swipeVec.getAngle() * (180 / Math.PI);
			this.emit('Swipe', degrees, (degrees > 60 && degrees < 120) ? 'up'
				: (degrees < -60 && degrees > -120) ? 'down'
				: (degrees > 120 || degrees < -120) ? 'right' : 'left',
				this._swipeCount);
		}
		this.clearInput(selectEvent);
	};
});