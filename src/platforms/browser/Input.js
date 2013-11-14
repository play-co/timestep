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
 * package timestep.env.browser.Input;
 *
 * This is imported as timestep.input.InputListener. This binds touch or mouse
 * events on the document (depending on what's specified in device). 
 * Additionally, if a canvas option is passed in or setElement(el) is called,
 * mouse over/out and start events are attached to the element. Used on the
 * canvas as well as DOM bindings.
 */

import device;
from util.browser import $;

import event.input.dispatch as input;
var eventTypes = input.eventTypes;

// import ...FPSCounter;

var UID = -1;

exports = Class(function (supr) {
	
	this.init = function (opts) {

		if (device.simulatingMobileNative || device.simulatingMobileBrowser) { this._simulateMobile = true; }
		
		this._evtQueue = [];
		this._rootView = opts.rootView;

		if (opts.el) {
			if (device.isMobileBrowser) {
				this._toggleNode = $({parent:document.body});
			}
			this.setElement(opts.el);
		}

		// Mouseover/out events do not fire for mobile browsers
		// that are driven solely by touch events, so in mobile
		// browsers, assume the canvas should always handle events.
		// Otherwise, only handle events if the mouse is over the
		// canvas.
		this._isOver = false;

		// disable the key listener on focus of input elements
		this._keyListener = opts.keyListener;

		if (device.useDOM) {
			$.onEvent(document, device.events.start, this, 'handleMouse', eventTypes.START);
		}
		
		this.enable();
		
		// this._evtFps = new FPSCounter({name: "mouse events"});
		
		this._hasFocus = false;
		if (document.addEventListener) {
			document.addEventListener('focus', bind(this, 'onFocusCapture'), true);
			document.addEventListener('blur', bind(this, 'onBlurCapture'), true);
		}
	}

	this.enable = function () {
		this._handleMove = $.onEvent(document, device.events.move, this, 'handleMouse', eventTypes.MOVE);
		this._handleSelect = $.onEvent(document, device.events.end, this, 'handleMouse', eventTypes.SELECT);
		this._handleScroll = $.onEvent(window, 'DOMMouseScroll', this, 'handleMouse', eventTypes.SCROLL); // FF
		this._handleWheel = $.onEvent(window, 'mousewheel', this, 'handleMouse', eventTypes.SCROLL); // webkit
	};

	this.disable = function () {
		if (this._handleMove) {
			this._handleMove();
			this._handleMove = false;
		}
		if (this._handleSelect) {
			this._handleSelect();
			this._handleSelect = false;
		}
		if (this._handleScroll) {
			this._handleScroll();
			this._handleScroll = false;
		}
		if (this._handleWheel) {
			this._handleWheel();
			this._handleWheel = false;
		}
	};
	
	this.onFocusCapture = function (e) {
		var tag = e.target.tagName;
		if (tag == 'TEXTAREA' || tag == 'INPUT') {
			this._hasFocus = e.target;
			this._keyListener && this._keyListener.setEnabled(false);
		}
	}
	
	this.onBlurCapture = function (e) {
		if (this._hasFocus) {
			this._hasFocus = null;
			this._keyListener && this._keyListener.setEnabled(true);
		}
	}
	
	this.setElement = function (el) {
		this._el = el;
		
		if (this._elEvents) {
			for(var i = 0, detach; detach = this._elEvents[i]; ++i) {
				detach();
			}
		}
		
		el.ondragstart = function () { return false; }
		el.onselectstart = function () { return false; }
		
		this._elEvents = [];
		
		if (!device.useDOM) {
			this._elEvents.push($.onEvent(el, device.events.start, this, 'handleMouse', eventTypes.START));
		}
		
		if (!device.isMobileBrowser && !device.isNative) {
			this._elEvents.push($.onEvent(el, 'mouseover', this, 'onMouseOver'));
			this._elEvents.push($.onEvent(el, 'mouseout', this, 'onMouseOut'));
		}
	}
	
	this.onMouseOver = function () { this._isOver = true; }
	this.onMouseOut = function () { this._isOver = false; }
	this.onMouseDown = function () { this._isMouseDown = true; }
	this.onMouseUp = function () { this._isMouseUp = true; }
	
	// for native-compatibility, always returns an empty array in the browser
	this.getEvents = function () { return this._evtQueue; }
	
	this.allowScrollEvents = function (allowScrollEvents) { this._allowScrollEvents = allowScrollEvents; }
	
	var empty = function () {};

	this.handleMouse = function (type, evt, recursive) {
		var target = evt.target;
		if (this._hasFocus && this._hasFocus == target || target && target.getAttribute && target.getAttribute('noCapture')) { return; }
		
		// if (!recursive) {
		// 	// remove the empty callback to log the raw mouse event fps
		// 	this._evtFps.tick(empty);
		// }
		
		var isMobileBrowser = device.isMobileBrowser;
		
		if (!device.useDOM && !isMobileBrowser && !this._isDown && this._el && evt.target != this._el) { return; }
		
		// Cancel all events that occur on the canvas.  Optionally, pass scroll events
		// through to the page (apps that don't care about handling scroll events may
		// want to pass them through for easier browser debugging).
		if (isMobileBrowser) {
			$.stopEvent(evt);
			evt.returnValue = false;
		} else if (this._isOver && (!this._allowScrollEvents || type != eventTypes.SCROLL)) {
			if (evt.stopPropagation) { evt.stopPropagation(); }
			if (type != eventTypes.START) {
				$.stopEvent(evt);
				evt.returnValue = false;
			}
		}
		
		// On ios devices, this event could correspond to multiple touches.  We recall
		// ourselves with each changed touch independently.
		if (evt.touches) {
			for (var i = 0, t; t = evt.changedTouches[i]; ++i) {
				this.handleMouse(type, t, true);
			}
			return;
		}

		var x, y;
		// Figure out where in the canvas the event fired.
		// if (isMobileBrowser) {
		// 	pt = {
		// 		x: evt.pageX,
		// 		y: evt.pageY
		// 	};
		// } else 
		if ('offsetX' in evt && !device.useDOM) {
			// Chrome makes life easy.  offsetX/offsetY is w.r.t. the target, which
			// for us should be the canvas.
			x = evt.offsetX;
			y = evt.offsetY;
		} else if (this._el.getBoundingClientRect) {
			// It's not too hard in other browsers that support getBoundingClientRect.
			// Get the absolute position of the canvas and do the math.
			var rect = this._el.getBoundingClientRect();
			x = evt.pageX - rect.left;
			y = evt.pageY - rect.top;
		} else {
			// Without boundingClientRect, life is hard.  This is the general
			// idea, but we need to loop for offsetParent/scrollLeft/scrollTop
			// to be at least partially complete.  Other libraries handle this
			// better, but the code complexity for that is huge.
			// 
			// TODO: older browsers will fail cause this code is buggy and untested?
			var offsetX, offsetY, parent = this._el;
			while (parent) {
				offsetX += parent.offsetTop;
				offsetY += parent.offsetLeft;
				parent = parent.parentNode;
			}
			
			x = evt.pageX - offsetX;
			y = evt.pageY - offsetY;
		}
		
		var id = evt.identifier || UID;
		
		if (this._simulateMobile) {
			switch (type) {
				case eventTypes.START:
					this._moveOK = true;
					break;
				case eventTypes.MOVE:
					if (!this._moveOK) { return; }
					break;
				case eventTypes.SELECT:
					this._moveOK = false;
					break;
			}
		}
		
		if (type == eventTypes.START) {
			this._isDown = true;
		} else if (type == eventTypes.SELECT) {
			this._isDown = false;
			
			if (this._toggleNode) {
				document.body.removeChild(this._toggleNode);
				document.body.appendChild(this._toggleNode);
			}
		}
		
		var inputEvent = new input.InputEvent(id, type, x, y);
		if (device.useDOM) {
			while (target && !target._view) {
				target = target.parentNode;
			}
			if (!target) { return; }
			inputEvent.target = target._view;
		}
		
		if (type == eventTypes.SCROLL) {
			// try to normalize scroll events! :-(
			
			// some browsers send both horizontal and vertical offsets in one event! nice!
			// other browsers don't. This is awful, since this is the least common denominator!
			// so we have to send two events even if the browser only sends one.
			if ('wheelDeltaX' in evt) {
				// default to Y
				inputEvent.scrollDelta = evt.wheelDeltaY / 120;
				inputEvent.scrollAxis = input.VERTICAL_AXIS;

				// if we also have X, then send it as a separate event
				if (evt.wheelDeltaX && evt.wheelDeltaY) {
					var e = inputEvent.clone();
					e.scrollDelta = evt.wheelDeltaX / 120;
					e.scrollAxis = input.HORIZONTAL_AXIS;

					input.dispatchEvent(this._rootView, e);
				} else if (evt.wheelDeltaX) {
					// we only have one of (X, Y) and it's X, so use X
					inputEvent.scrollDelta = evt.wheelDeltaX / 120;
					inputEvent.scrollAxis = input.HORIZONTAL_AXIS;
				}

			} else if (evt.detail) {
				inputEvent.scrollDelta = -evt.detail;
				inputEvent.scrollAxis = 'axis' in evt ? evt.axis == evt.VERTICAL_AXIS ? input.VERTICAL_AXIS : input.HORIZONTAL_AXIS : input.VERTICAL_AXIS;
			} else if (evt.wheelDelta) { // IE/Opera
				inputEvent.scrollDelta = (window.opera ? 1 : -1) * evt.wheelDelta / 120;
				inputEvent.scrollAxis = input.VERTICAL_AXIS;
			}
		}

		input.dispatchEvent(this._rootView, inputEvent);
	}
	
});
