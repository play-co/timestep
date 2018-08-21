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
 * @doc http://doc.gameclosure.com/api/appengine.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/appengine.md
 */
import { merge } from 'base';

import Emitter from 'event/Emitter';

import dispatch from 'event/input/dispatch';

import timer from 'timer';
import ReflowManager from 'ui/backend/ReflowManager';

import device from 'device';

import Matrix2D from '../platforms/browser/webgl/Matrix2D';

import KeyListener from 'platforms/browser/KeyListener';
import InputListener from 'platforms/browser/Input';

import Canvas from 'platforms/browser/Canvas';

var IDENTITY_MATRIX = new Matrix2D();

/**
 * @extends event.Emitter
 */
class Engine extends Emitter {
  constructor () {
    super();

    this._opts = {
      keyListenerEnabled: true
    };

    timer.onTick = this._tick.bind(this);

    var width = device.width;
    var height = device.height;

    this._rootElement = new Canvas({
      // use an existing canvas if one was provided, but wrap the 2D context
      useWebGL: true,
      // use WebGL if supported
      width: width,
      height: height,
      offscreen: false
    });

    this.useWebGL = this._rootElement.isWebGL;

    var dpr = device.screen.devicePixelRatio;
    this._rootElement.style.width = width / dpr + 'px';
    this._rootElement.style.height = height / dpr + 'px';
    this._rootElement.style.top = '0px';
    this._rootElement.style.left = '0px';
    this._rootElement.style.position = 'absolute';
    this._rootElement.id = 'timestep_onscreen_canvas';
    this._ctx = this._rootElement.getContext();

    this._events = [];

    if (KeyListener) {
      this._keyListener = new KeyListener();
      this._keyListener.setEnabled(true);
    }

    this._reflowMgr = ReflowManager.get();

    this._tickBuffer = 0;

    // configure auto-layout (expand to fill the viewport)
    device.width = width;
    device.height = height;
    device.screen.width = width;
    device.screen.height = height;

    this._view = null;
    this._inputListener = null;
  }
  getOpt (key) {
    return this._opts[key];
  }
  updateOpts (opts) {
    this._opts = merge(opts, this._opts);
    this._setKeyListener(this._opts.keyListenerEnabled);
  }
  _setKeyListener (enabled) {
    if (this._keyListener) {
      this._keyListener.setEnabled(enabled);
    }
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
  getView () {
    return this._view;
  }
  setView (view) {
    this._view = view;

    this._inputListener = new InputListener({
      rootView: this._view,
      el: this._rootElement,
      keyListener: this._keyListener,
      engine: this
    });

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
  startLoop () {
    if (this.isRunning()) {
      return;
    }

    timer.start();
    this.emit('resume');
    return this;
  }
  stopLoop () {
    if (!this.isRunning()) {
      return;
    }

    timer.stop();
    this.emit('pause');
    return this;
  }
  isRunning () {
    return timer.isRunning;
  }
  _tick (dt) {
    this._events = this._inputListener.getEvents();
    for (var i = 0; i < this._events.length; i++) {
      dispatch.dispatchEvent(this._view, this._events[i]);
    }

    // ticking
    this.publish('Tick', this._opts.dtFixed || dt);
    this._view.__view.wrapTick(dt, this);

    // layouting
    this._reflowMgr.reflowViews(this._ctx);

    // rendering
    this._view.__view.wrapRender(this._ctx, IDENTITY_MATRIX, 1);
    this.publish('Render', this._ctx);

    if (this._ctx) {
      this._ctx.swap();
    }
  }
}

Engine.prototype.getElement = Engine.prototype.getCanvas;

export default new Engine();
