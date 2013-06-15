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
 * @class event.input.InputEvent;
 * This class represents an input event.
 * 
 * It assumes a tree structure of View objects.  The top (root) of the
 * tree is typically the main Application view.  
 * 
 * Events are assigned a root and a target.  View::dispatchEvent
 * computes the root and target from the event location (x, y).
 *
 * Propogation has two phases: capturing and bubbling.  Users 
 * can mostly ignore capturing as the primary hooks are in the 
 * bubbling.  Bubbling is defined as calling event handlers on
 * each view starting with 'target' and then continuing up 
 * superview pointers until reaching 'root'.  Views can listen
 * to the event bubbling by adding methods such as:
 * "input:start" -> "function onInputStart(evt)"
 * "input:drag" -> "function onDrag(dragEvt, moveEvt, delta)"
 *
 * Other code can hook into a view's events by calling:
 *   myView.subscribe('input:start', function () { alert('Mouse Down'); });
 *   myView.subscribe('input:end', this, 'onChildViewClick');
 *
 * Propogation of events can be cancelled by calling evt.cancel().
 *
 * Note that onDrag is a special event that receives not only
 * a move event from an 'input:move' event, but also a custom
 * dragEvt object that contains extra data such as the start
 * position of the drag.
 *
 * @doc http://doc.gameclosure.com/api/event.html#class-event.input.inputevent
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/event.md
 */

import math.geom.Point as Point;
import timer;

var InputEvent = exports = Class(function () {
	this.cancelled = false; // If true, this event will not propogate
	this.depth = 0; // Number of levels of the tree from root to target (inclusive)
	
	// Note that under normal usage:
	//   this.depth == this.trace.length
	//   this.root = this.trace[this.trace.length - 1]
	//   this.target = this.trace[0]
	
	this.init = function (id, evtType, x, y, root, target) {
		// unique ID for a particular input - the ID should be constant for a given input
		// for example, the mouse should always have the same ID.  Each finger (touch)
		// should have the same ID throughout the touch start/move/end process
		this.id = id; 
		
		// string evtType, e.g. 'input:start'
		this.type = evtType;
		
		// localized point coordinates, indexed by a view's uid (View::uid)
		// @internal --at least for now, concerns over performance.
		this.point = this.pt = {};
		
		// raw (x, y) coordinates
		this.srcPoint = this.srcPt = new Point(x, y);
		
		// list of View nodes from target to root
		this.trace = [];
		
		// Top-most view where event is dispatched (e.g. the tree root)
		this.root = root || null;
		
		// time of dispatch
		this.when = timer.now;
		
		// Bottom-most view where the event occurred
		this.target = target || null;
	}
	
	this.cancel = function () {
		this.cancelled = true;
	}

	this.clone = function () {
		return new InputEvent(this.id, this.type, this.srcPt.x, this.srcPt.y, this.root, this.target);
	}
});
