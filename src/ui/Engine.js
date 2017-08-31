let exports = {};

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
import {
  GLOBAL,
  merge,
  bind
} from 'base';

import Emitter from 'event/Emitter';

import dispatch from 'event/input/dispatch';

import timer from 'timer';
import ReflowManager from 'ui/backend/ReflowManager';
import FPSView from 'ui/backend/debug/FPSView';

import engineInstance from './engineInstance';

import device from 'device';

import InputEvent from 'event/input/InputEvent';

import Matrix2D from '../platforms/browser/webgl/Matrix2D';

var IDENTITY_MATRIX = new Matrix2D();

import KeyListener from 'platforms/browser/KeyListener';
import InputListener from 'platforms/browser/Input';

import Canvas from 'platforms/browser/Canvas';
import doc from 'platforms/browser/doc';

var _timers = [];
timer.onTick = function (dt) {
  var i = _timers.length;
  while (i--) {
    _timers[i](dt);
  }
};

// var interval = 5000;
// var timePerFrame = 0;
// var sampleIdx = 0;
// setInterval(function() {
//   sampleIdx += 1;
//   var entries = window.performance.getEntriesByName('timePerFrame');
//   var total = 0;
//   var nbSamples = interval * 60 / 1000;
//   var start = Math.max(0, entries.length - nbSamples);
//   for (var i = start; i < entries.length; i += 1) {
//     total += entries[i].duration;
//   }
//   timePerFrame = total / (entries.length - start);
//   var log = '* sample after ' + (sampleIdx * interval / 1000) + 's';
//   log += '  ms/frame = ' + timePerFrame.toFixed(2);
//   console.error(log);
// }, interval);

// var _timers = [];
// timer.onTick = function (dt) {
// performance.mark('start');
//   var i = _timers.length;
//   while (i--) {
//     _timers[i](dt);
//   }
// performance.mark('end');
// performance.measure('timePerFrame', 'start', 'end');
// };


var __instance = null;

/**
 * @extends event.Emitter
 */
exports = class extends Emitter {
  constructor (opts) {
    super();

    if (!__instance) {
      __instance = this;
      engineInstance.setInstance(this);
    }

    var canvas = opts && opts.canvas;
    if (typeof canvas == 'string' && GLOBAL.document && document.getElementById) {
      const canvasID = canvas;
      canvas = document.getElementById(canvasID);
      if (!canvas) {
        throw new Error('Canvas not found for ID: ' + canvasID);
      }
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

    this._rootElement = new Canvas({
      el: canvas,
      // use an existing canvas if one was provided, but wrap the 2D context
      useWebGL: true,
      // use WebGL if supported
      width: opts.width,
      height: opts.height,
      offscreen: false
    });

    this.useWebGL = this._rootElement.isWebGL;

    canvas = this._rootElement;

    var dpr = device.screen.devicePixelRatio;
    this._rootElement.style.width = opts.width / dpr + 'px';
    this._rootElement.style.height = opts.height / dpr + 'px';
    this._rootElement.id = 'timestep_onscreen_canvas';
    this._ctx = this._rootElement.getContext('2d');
    this._ctx.font = '11px ' + device.defaultFontFamily;

    this._view = opts.view;
    this._view.style.update({
      width: opts.width,
      height: opts.height
    });

    this._events = [];

    if (KeyListener) {
      this._keyListener = new KeyListener();
    }

    this._inputListener = new InputListener({
      rootView: this._view,
      el: this._rootElement,
      keyListener: this._keyListener,
      engine: this
    });

    this._reflowMgr = ReflowManager.get();

    this._tickBuffer = 0;
    this._onTick = [];

    // configure auto-layout in the browser (expand
    // to fill the viewport)
    if (device.name == 'browser') {
      device.width = opts.width;
      device.height = opts.height;
      device.screen.width = opts.width;
      device.screen.height = opts.height;
      if (doc) {
        doc.setEngine(this);
      }
    }

    this._needsRepaint = false;

    this.updateOpts(this._opts);
  }
  getOpt (key) {
    return this._opts[key];
  }
  updateOpts (opts) {
    this._opts = merge(opts, this._opts);
    if (this._keyListener) {
      this._keyListener.setEnabled(this._opts.keyListenerEnabled);
    }

    if (this._opts.scaleUI) {
      if (Array.isArray(this._opts.scaleUI)) {
        if (this._opts.scaleUI.length != 2) {
          throw new Error('Illegal value for engine option scaleUI: ' +
            this._opts.scaleUI);
        }
        this.scaleUI(this._opts.scaleUI[0], this._opts.scaleUI[1]);
      } else {
        this.scaleUI(576, 1024);
      }
    }

    if (this._opts.showFPS) {
      if (!this._applicationFPS) {
        this._applicationFPS = new FPSView({ application: this });
      }

      this._renderFPS = bind(this._applicationFPS, this._applicationFPS.render);
      this._tickFPS = bind(this._applicationFPS, this._applicationFPS.tick);
    } else {
      this._renderFPS = function () {};
      this._tickFPS = function () {};
    }
  }
  scaleUI (w, h) {
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
  }
  supports (key) {
    return this._opts[key];
  }
  getInput () {
    return this._inputListener;
  }
  getKeyListener () {
    return this._keyListener;
  }
  getEvents () {
    return this._events;
  }
  getCanvas () {
    return this._rootElement;
  }
  getViewCtor () {
    return View;
  }
  getView () {
    return this._view;
  }
  setView (view) {
    this._view = view;
    return this;
  }
  show () {
    this._rootElement.style.display = 'block';
    return this;
  }
  hide () {
    this._rootElement.style.display = 'none';
    return this;
  }
  pause () {
    this.stopLoop();
    if (this._keyListener) {
      this._keyListener.setEnabled(false);
    }
  }
  resume () {
    this.startLoop();
    if (this._keyListener) {
      this._keyListener.setEnabled(true);
    }
  }
  stepFrame (n) {
    this.pause();
    n = n || 1;
    this._countdown = n;
    this.resume();
  }
  startLoop (dtMin) {
    if (this._running) {
      return;
    }
    this._running = true;

    this.now = 0;
    timer.start(dtMin || this._opts.dtMinimum);
    this.emit('resume');
    return this;
  }
  stopLoop () {
    if (!this._running) {
      return;
    }
    this._running = false;
    timer.stop();
    this.emit('pause');
    return this;
  }
  isRunning () {
    return this._running;
  }
  doOnTick (cb) {
    if (arguments.length > 1) {
      cb = bind.apply(this, arguments);
    }
    this._onTick.push(cb);
  }
  _tick (dt) {
    // if the countdown is defined
    if (this._countdown !== null) {
      this._countdown--;

      // if below zero, stop timer
      if (this._countdown === -1) {
        this.pause();
        this._countdown = null;
      }
    }

    if (this._ctx) {
      var el = this._ctx.getElement();
      var s = this._view.style;
      if (el && (s.width != el.width / s.scale || s.height != el.height / s
          .scale)) {
        s.width = el.width / s.scale;
        s.height = el.height / s.scale;
      }
    }

    for (var i = 0, cb; cb = this._onTick[i]; ++i) {
      cb(dt);
    }

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
        if (this._opts.repaintOnEvent) {
          this.needsRepaint();
        }
      } else if (this._opts.continuousInputCheck) {
        var prevMove = dispatch._evtHistory['input:move'];
        if (prevMove) {
          dispatch.dispatchEvent(this._view, new InputEvent(prevMove.id,
            prevMove.type, prevMove.srcPt));
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

    this._reflowMgr.reflowViews(this._ctx);

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
  }
  render (dt) {
    if (this._opts.clearEachFrame) {
      this._ctx && this._ctx.clear();
    }

    this._view.__view.constructor.absScale = 1;
    this._view.__view.wrapRender(this._ctx, IDENTITY_MATRIX, 1);
    this.publish('Render', this._ctx);

    if (this._ctx) {
      if (DEBUG) {
        this._renderFPS(this._ctx, dt);
      }

      this._ctx.swap();
    }
  }
  needsRepaint () {
    this._needsRepaint = true;
    return this;
  }
  __tick (dt) {
    this._tickFPS(dt);
    this.publish('Tick', dt);
    this._view.__view.wrapTick(dt, this);
  }
};

var Engine = exports;

Engine.prototype.getElement = Engine.prototype.getCanvas;

exports.get = function () {
  return __instance;
};

export default exports;
