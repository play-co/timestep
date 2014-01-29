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
 * @class ui.Engine
 *
 * This is the game engine for timestep. It is built on a scene graph composed
 * of "views", and has canvas and DOM rendering backends.
 *
 * Responsibilities for the application engine includes initializing the canvas,
 * input and key listeners, game loop, animation tick, the view hierarchy and
 * rendering the scene graph.
 *
 * Not to be confused with GC.Application, the superclass exposed to games which
 * controls the game loop. A single ui.Engine is instantiated for
 * games which resides at GC.app.engine.
 *
 * @doc http://doc.gameclosure.com/api/appengine.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/appengine.md
 */

import event.Emitter as Emitter;

import event.input.dispatch as dispatch;

import timer;
import ui.backend.ReflowManager as ReflowManager;

import device;

var _timers = [];
timer.onTick = function (dt) {
	var i = _timers.length;
	while (i--) {
		_timers[i](dt);
	}
}

var __instance = null;

/**
 * @extends event.Emitter
 */
var Engine = exports = Class(Emitter, function (supr) {
	this.init = function (opts) {
		if (!__instance) {
			import .StackView;

			__instance = this;
		}

		var canvas = opts && opts.canvas;
		if (typeof canvas == 'string' && GLOBAL.document && document.getElementById) {
			canvas = document.getElementById(canvas);
		}

		this._opts = opts = merge(opts, {
			keyListenerEnabled: true,
			width: canvas && canvas.width || device.width,
			height: canvas && canvas.height || device.height,
			view: null,
			dtFixed: 0,
			dtMinimum: 0,
			clearEachFrame: true,
			alwaysRepaint: true,
			repaintOnEvent: true,
			mergeMoveEvents: false,
			continuousInputCheck: !device.isMobileBrowser && !device.isMobile,
			showFPS: false
		});

		_timers.push(bind(this, this._tick));

		this._doubleBuffered = true;
		this._countdown = null;

		if (!device.useDOM) {
			var Canvas = device.get('Canvas');
			this._rootElement = new Canvas({
				el: canvas, // use an existing canvas if one was provided, but wrap the 2D context
				width: opts.width,
				height: opts.height,
				offscreen: false
			});

			this._rootElement.id = "timestep_onscreen_canvas";
			this._ctx = this._rootElement.getContext('2d');
			this._ctx.font = '11px ' + device.defaultFontFamily;
		}

		this._view = opts.view || new StackView();
		this._view.style.update({
			width: opts.width,
			height: opts.height
		});

		if (device.useDOM) {
			this._rootElement = this._view.getBacking().getElement();
		}

		// __root is a pointer to the Engine instance that a view
		// is currently attached to.  If __root is null, the view
		// is not currently in a view hierarchy.
		this._view.__root = this;
		
		this._events = [];

		if (dispatch.KeyListener) {
			this._keyListener = new dispatch.KeyListener();
		}

		this._inputListener = new dispatch.InputListener({
			rootView: this._view,
			el: this._rootElement,
			keyListener: this._keyListener
		});

		this._reflowManager = ReflowManager.get();

		this._view.setReflowManager(this._reflowManager);

		this._tickBuffer = 0;
		this._onTick = [];

		// configure auto-layout in the browser (expand
		// to fill the viewport)
		if (device.name == 'browser') {
			if (canvas) {
				device.width = canvas.width;
				device.height = canvas.height;
				device.screen.width = canvas.width;
				device.screen.height = canvas.height;
			} else {
				var doc = device.get('doc');
				if (doc) {
					doc.setEngine(this);
				}
			}
		}

		this.updateOpts(this._opts);
	};

	this.updateOpts = function (opts) {
		this._opts = merge(opts, this._opts);
		if (this._keyListener) {
			this._keyListener.setEnabled(this._opts.keyListenerEnabled);
		}

		if (this._opts.scaleUI) {
			if (Array.isArray(this._opts.scaleUI)) {
				if (this._opts.scaleUI.length != 2) {
					throw new Error("Illegal value for engine option scaleUI: " + this._opts.scaleUI);
				}
				this.scaleUI(this._opts.scaleUI[0], this._opts.scaleUI[1]);
			} else {
				this.scaleUI(576, 1024);
			}
		}

		if (this._opts.noReflow) {
			this._reflowManager = null;
			this._view.setReflowManager(null);
		}

		if (this._opts.showFPS) {
			if (!this._applicationFPS) {
				import ui.backend.debug.FPSView as FPSView;
				this._applicationFPS = new FPSView({application: this});
			}
			
			this._renderFPS = bind(this._applicationFPS, this._applicationFPS.render);
			this._tickFPS = bind(this._applicationFPS, this._applicationFPS.tick);
		} else {
			this._renderFPS = function () {};
			this._tickFPS = function () {};
		}
	};

	this.scaleUI = function (w, h) {
		if (device.height > device.width) {
			this._view.baseWidth = w;
			this._view.baseHeight = device.height * (w / device.width);
			this._view.scale = device.width / this._view.baseWidth;
		} else {
			this._view.baseWidth = h;
			this._view.baseHeight = device.height * (h / device.width);
			this._view.scale = device.height / this._view.baseHeight;
		}
		this._view.style.scale = this._view.scale;
	};

	this.supports = function (key) {
		return this._opts[key];
	};

	/* @internal */
	this.getInput = function () {
		return this._inputListener;
	};

	this.getKeyListener = function () {
		return this._keyListener;
	};

	this.getEvents = function () {
		return this._events;
	};

	// deprecating getCanvas...
	this.getElement = this.getCanvas = function () {
		return this._rootElement;
	};

	this.getViewCtor = function () {
		return View;
	};

	this.getView = function () {
		return this._view;
	};

	this.setView = function (view) {
		this._view = view; return this;
	};

	this.getReflowManager = function () {
		return this._reflowManager;
	};

	this.show = function () {
		this._rootElement.style.display = 'block';
		return this;
	};

	this.hide = function () {
		this._rootElement.style.display = 'none';
		return this;
	};
	
	this.pause = function () {
		this.stopLoop();
		if (this._keyListener) {
			this._keyListener.setEnabled(false);
		}
	};

	this.resume = function () {
		this.startLoop();
		if (this._keyListener) {
			this._keyListener.setEnabled(true);
		}
	};

	this.stepFrame = function (n) {
		this.pause();
		n = n || 1;
		this._countdown = n;
		this.resume();
	};

	this.startLoop = function (dtMin) {
		if (this._running) { return; }
		this._running = true;
		
		this.now = 0;
		timer.start(dtMin || this._opts.dtMinimum);
		return this;
	};

	this.stopLoop = function () {
		if (!this._running) { return; }
		this._running = false;
		
		timer.stop();
		return this;
	};

	this.isRunning = function () {
		return this._running;
	};

	this.doOnTick = function (cb) {
		if (arguments.length > 1) { cb = bind.apply(this, arguments); }
		this._onTick.push(cb);
	};

	this._tick = function (dt) {
		//if the countdown is defined
		if (this._countdown !== null) {
			this._countdown--;

			//if below zero, stop timer
			if (this._countdown === -1) {
				this.pause();
				this._countdown = null;
			}
		}

		if (this._ctx) {
			var el = this._ctx.getElement();
			var s = this._view.style;
			if (el && (s.width != el.width / s.scale || s.height != el.height / s.scale)) {
				s.width = el.width / s.scale;
				s.height = el.height / s.scale;
			}
		}

		for (var i = 0, cb; cb = this._onTick[i]; ++i) { cb(dt); }

		var events = this._inputListener.getEvents();
		var n = events.length;

		this._events = events;
		if (this._opts._mergeMoveEvents) {
			var hasMove = false;
			for (var i = n - 1; i >= 0; --i) {
				if (events[i].type == dispatch.eventTypes.MOVE) {
					if (!hasMove) { 
						hasMove = true;
					} else {
						events.splice(i, 1);
					}
				}
			}
		}

		for (var i = 0, evt; evt = events[i]; ++i) {
			evt.srcApp = this;
			dispatch.dispatchEvent(this._view, evt);
		}

		if (!device.useDOM) {
			if (i > 0) {
				if (this._opts.repaintOnEvent) { this.needsRepaint(); }
			} else if (this._opts.continuousInputCheck) {
				var prevMove = dispatch._evtHistory['input:move'];
				if (prevMove) {
					dispatch.dispatchEvent(this._view, new dispatch.InputEvent(prevMove.id, prevMove.type, prevMove.srcPt));
				}
			}
		}

		if (this._opts.dtFixed) {
			this._tickBuffer += dt;
			while (this._tickBuffer >= this._opts.dtFixed) {
				this._tickBuffer -= this._opts.dtFixed;
				this.now += this._opts.dtFixed;
				this.__tick(this._opts.dtFixed);
			}
		} else {
			this.__tick(dt);
		}

		if (this._reflowManager) {
			this._reflowManager.startReflow(this._ctx);
			this._reflowManager.setInRender(true);
		}

		var doRepaint = this._opts.alwaysRepaint || this._needsRepaint;
		if (!doRepaint && this._doubleBuffered && this._doubleBufferedState > 0) {
			// even if we don't repaint, we need to paint at least 1 more time
			// for devices that use multiple buffers (like the ios, I think...)
			--this._doubleBufferedState;
			this.render(dt);
		} else if (doRepaint) {
			this._doubleBufferedState = 3;
			this.render(dt);
		}

		this._needsRepaint = false;
		this._reflowManager && this._reflowManager.setInRender(false);
	};

	this.render = function (dt) {
		if (this._opts.clearEachFrame) {
			this._ctx && this._ctx.clear();
		}

		this._view.__view.constructor.absScale = 1;
		this._view.__view.wrapRender(this._ctx, {});
		this.publish('Render', this._ctx);

		if (this._ctx) {
			if (DEBUG) {
				this._renderFPS(this._ctx, dt);
			}

			this._ctx.swap();
		}
	};

	this.needsRepaint = function () {
		this._needsRepaint = true;
		return this;
	};

	this.__tick = function (dt) {
		this._tickFPS(dt);
		this.publish('Tick', dt);
		this._view.__view.wrapTick(dt, this);
	};

	var log_counter = 0;

});

exports.get = function () { return __instance; };
