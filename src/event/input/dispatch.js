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
 * @module event.input.dispatch;
 * This namespace includes functions to dispatch touch events starting from the
 * root application view, which are traced through the hierarchy to each view's
 * individual InputHandler proxy. Additionally, this namespace includes those
 * functions actually in timestep.input, like InputListener and KeyListener classes.
 */

import math.geom.Point as Point;
import device;
import lib.Enum;

exports.eventTypes = new lib.Enum('START', 'MOVE', 'SELECT', 'SCROLL', 'CLEAR');
exports.VERTICAL_AXIS = 2;
exports.HORIZONTAL_AXIS = 1;

/**
 * capture/bubble event, starting from root Application view
 *  - publish <inputTypeCapture> on the way down (e.g. onInputStartCapture)
 *  - call callbacks (e.g. onInputStart) and publish <inputType> (e.g. onInputstart)
 *    on the way up, checking evt.cancelled to see if someone has cancelled the event
 */
exports.dispatchEvent = function (root, evt) {
	// if (evt.type == input.eventTypes.MOVE) { var now = +new Date(); }
	// store the root in case an event listener wants the top-most view?
	evt.root = root;
	
	// SHOULD_HANDLE = LOCALIZE = 0;

	// grab the bottom-most view whose bounding box contains the evt.srcPt
	// also updates the evt object with a trace of localized points and views
	exports.traceEvt(root, evt, evt.srcPt);

	// if (now) { logger.log('TRACED A', LOCALIZE, SHOULD_HANDLE) }
	
	// once we've traced the event, we know how deep it goes
	var depth = evt.depth;
	
	exports._evtHistory[evt.type] = evt;
	
	var signal = exports._evtCb[evt.type] || exports.getEvtCbName(evt.type);
	
	for (var i = depth - 1; i >= 0; --i) {
		var view = evt.trace[i],
			pt = evt.pt[view.uid];
		view.publish(signal + 'Capture', evt, pt, i == 0);
		if (evt.cancelled || view.__input.blockEvents) { return; }
	}
	
	var cbName = 'on' + signal;
	for (var i = 0; i < depth; ++i) {
		var view = evt.trace[i];
		if (view.__input.canHandleEvents) {
			var pt = evt.pt[view.uid];
			if (view[cbName]) { view[cbName](evt, pt, i == 0); }
			view.publish(signal, evt, pt, i == 0);
			view._onEventPropagate(evt, pt, i == 0);
			if (evt.cancelled) { break; }
		}
	}
}

/**
 * Trace an event recursively down to the view on which the event is triggered.
 */
exports.traceEvt = function (view, evt, pt) {
	// var now = +new Date();
	var localPt = view.style.localizePoint(new Point(pt));
	var inputHandler = view.getInput();
	if (!inputHandler.containsEvent(evt, localPt)) { return false; }

	var canHandleEvents = view.getInput().canHandleEvents;
	if (canHandleEvents) {
		evt.depth++;
		evt.trace.unshift(view);
		evt.pt[view.uid] = localPt;
	}
	
	var subviews = view.getSubviews();
	for (var i = subviews.length - 1; i >= 0; --i) {
		if (subviews[i].style.visible && exports.traceEvt(subviews[i], evt, localPt)) {
			return true;
		}
	}
	
	if (canHandleEvents) {
		evt.target = view;
		return true;
	}
}

exports._evtHistory = {};
exports._activeInputOver = {};

exports.clearOverState = function (id) {
	if (id) {
		var evt = exports._activeInputOver[id];
		if (evt) {
			delete exports._activeInputOver[id];
			var trace = evt.trace;
			if (trace) {
				for (var i = 0, view; view = trace[i]; ++i) {
					view.__input.onLeave(id);
				}
			}
		}
	} else {
		for (var id in exports._activeInputOver) {
			exports.clearOverState(id);
		}
	}
}

exports._isDragging = false;
exports.isDragging = function () { return exports._isDragging; }

exports._evtCb = {};
exports.getEvtCbName = function (evtType) {
	var name = exports.eventTypes[evtType];
	return (exports._evtCb[evtType] = 'Input' + name.charAt(0) + name.substring(1).toLowerCase());
}

/**
 * Aliases for children of the timestep.input "package".
 */

exports.InputListener = device.get('Input');
exports.KeyListener = device.get('KeyListener');

import .InputEvent as exports.InputEvent;
