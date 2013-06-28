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
 * @class event.input.InputHandler;
 * An event handler proxy for an individual view. This handles dispatching
 * of events onto the actual view itself, as well as determining if the view
 * is the actual target of a propagated event. 
 */

import math.geom.Point as Point;
import event.input.dispatch as dispatch;

var InputHandler = exports = Class(function () {
	
	// ---- start mouseover
	this.startCount = 0;
	this.dragCount = 0;
	this.overCount = 0;
	this.canHandleEvents = true;
	this.blockEvents = false;

	this.init = function (view, opts) {
		this.view = view;

		if ('canHandleEvents' in opts) {
			this.canHandleEvents = opts.canHandleEvents;
		}

		if ('blockEvents' in opts) {
			this.blockEvents = opts.blockEvents;
		}
	}
	
	this.containsEvent = function (evt, localPt) {
		// block events must be false
		return !this.blockEvents && (!this.view._superview   // top-view captures all events
				|| this.view.containsLocalPoint(localPt));
	}

	this.onEnter = function (id, atTarget) {
		var view = this.view;
		var over = this._over || (this._over = {});
		if (id in over) { return; }
		
		over[id] = true;
		this.overCount++;
		
		if (view.onInputOver) { view.onInputOver(over, this.overCount, atTarget); }
		view.publish('InputOver', over, this.overCount, atTarget);
	}
	
	this.onLeave = function (id, atTarget) {
		var view = this.view;
		var over = this._over || (this._over = {});
		if (!(id in over)) { return; }
		
		delete over[id];
		--this.overCount;
		
		if (view.onInputOut) { view.onInputOut(over, this.overCount, atTarget); }
		view.publish('InputOut', over, this.overCount, atTarget);
	}
	
	this.resetOver = function () {
		delete this._over;
		this.overCount = 0;
	}
	
	// ---- end mouseover
	
	
	// ---- start drag
	
	this.startDrag = function (opts) {
		opts = opts || {};
		var view = this.view;
		var inputStartEvt = opts.inputStartEvt || opts.inputStartEvent || dispatch._evtHistory[dispatch.eventTypes.START];
		var id = inputStartEvt.id;
		
		// dedup drags from same input ID
		var dragging = this._isDragging || (this._isDragging = {});
		if (dragging[id]) { return; }
		dragging[id] = true;
		
		++this.dragCount;
		++this.startCount;

		var root = inputStartEvt.root;
		var dragEvt = new dispatch.InputEvent(inputStartEvt.id, 'input:drag', inputStartEvt.srcPt.x, inputStartEvt.srcPt.y, root, view);
		
		dragEvt.didDrag = false;
		dragEvt.radius = opts.radius * opts.radius || 0;
		
		root.subscribe('InputMoveCapture', this, 'onDragStart', dragEvt);
		root.subscribe('InputSelectCapture', this, 'onDragStop', dragEvt);
	}
	
	this.isDragging = function () { return this.dragCount && dispatch._isDragging; }
	
	this.onDragStart = function (dragEvt, moveEvt) {
		// have we exceeded the move radius?
		var dx = moveEvt.srcPt.x - dragEvt.srcPt.x;
		var dy = moveEvt.srcPt.y - dragEvt.srcPt.y;
		if (dx * dx + dy * dy <= dragEvt.radius) { return; }

		if (dragEvt.didDrag) {
			return;
		}
		dragEvt.didDrag = true;
		--this.startCount;
		
		var view = this.view;
		
		// no longer need to listen for move events for onDragStart
		if (this.startCount == 0) {
			dragEvt.root.unsubscribe('InputMoveCapture', this, 'onDragStart');
		}
		
		// want to fire onDragStart with the current point equal to the initial point 
		// even though the user has moved away by now
		dragEvt.currPt = dragEvt.srcPt;
		dragEvt.localPt = view.localizePoint(new Point(dragEvt.currPt));

		if (view.onDragStart) { view.onDragStart(dragEvt); }
		view.publish('DragStart', dragEvt);
		
		// future move events should be captured by _onDrag
		// we should also call _onDrag now to handle the current move event delta
		dragEvt.root.subscribe('InputMoveCapture', this, 'onDrag', dragEvt);
		this.onDrag(dragEvt, moveEvt);
	}
	
	this.onDrag = function (dragEvt, moveEvt) {
		if (dragEvt.id != moveEvt.id
				|| moveEvt.srcPt.x == dragEvt.currPt.x && moveEvt.srcPt.y == dragEvt.currPt.y) { return; }

		var view = this.view;
		
		dragEvt.prevPt = dragEvt.currPt;
		dragEvt.currPt = moveEvt.srcPt;

		dragEvt.prevLocalPt = dragEvt.localPt;
		dragEvt.localPt = view.localizePoint(new Point(dragEvt.currPt));

		var delta = Point.subtract(dragEvt.localPt, dragEvt.prevLocalPt);

		dispatch._isDragging = true;

		if (view.onDrag) { view.onDrag(dragEvt, moveEvt, delta); }
		view.publish('Drag', dragEvt, moveEvt, delta);
		
		//moveEvt.cancel();
	}
	
	this.onDragStop = function (dragEvt, selectEvt) {
		var id = dragEvt.id;
		var dragging = this._isDragging || (this._isDragging = {});
		if (!dragging[id] || dragEvt.id != selectEvt.id) { return; }
		
		delete dragging[id];
		--this.dragCount;

		if (!this.dragCount) {
			dragEvt.root.unsubscribe('InputMoveCapture', this, 'onDragStart');
			dragEvt.root.unsubscribe('InputMoveCapture', this, 'onDrag');
			dragEvt.root.unsubscribe('InputSelectCapture', this, 'onDragStop');
			dispatch._isDragging = false;
		}
		
		if (dragEvt.didDrag) {
			var view = this.view;
			
			// a subscription can later 'uncancel' the selectEvt by setting 'selectEvt.cancelled = false;'
			selectEvt.cancel();
			
			if (view.onDragStop) { view.onDragStop(dragEvt, selectEvt); }
			view.publish('DragStop', dragEvt, selectEvt);
		}
	}
	
	// ---- end drag
});
