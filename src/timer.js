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
 * Provides an interface to the time for a timestep app.  The interface can be
 * queried by the app for information about elapsed time.  It is consumed by the
 * timestep {@link Engine} to drive the Engine's tick and render.
 *
 * Use {@linkcode module:timer.maxTick|maxTick} and {@linkcode
 * module:timer.tickCap|tickCap} to control the behavior of the timer.
 *
 * For example, assume `maxTick = 100000` (10,000ms) and `tickCap = 100`
 * (100ms).  The following behavior will occur for various tick `dt` values:
 *  - `20 ⟶ onTick(20)`
 *  - `100 ⟶ onTick(100)`
 *  - `120 ⟶ onTick(100)`
 *  - `9999 ⟶ onTick(100)`
 *  - `10000 ⟶ onTick(10000)`
 *  - `10001 ⟶ onLargeTick(10001, 10000); onTick(1)`
 *  - `40000 ⟶ onLargeTick(40000, 10000); onTick(1)`
 *
 * @module timer
 */

import device;

var Timer = device.get('Timer');

// ticks over 10 seconds will be considered too large to forward to the app
var _maxTick = 10 * 1000;
var _tickCap = _maxTick;
var _now = 0;
var _frames = 0;

/**
 * Defines the maximum milliseconds for a tick before the tick is dropped and
 * {@linkcode module:timer.onLargeTick|onLargeTick} is called. {@linkcode
 * module:timer.onTick|onTick} will also be called with a `dt` of 1.
 * @member module:timer.maxTick {integer}
 * @default 10,000
 */
Object.defineProperty(exports, 'maxTick', {
  get: function () { return _maxTick; },
  set: function (value) { _maxTick = value; }
});

/**
 * Defines the maximum value of `dt`.  If a tick `dt` is above the cap,
 * {@linkcode module:timer.onTick|onTick} is called with `tickCap` rather than
 * `dt`.
 * @member module:timer.tickCap {integer}
 * @default 10,000
 */
exports.tickCap;
Object.defineProperty(exports, 'tickCap', {
  get: function () { return _tickCap; },
  set: function (value) { _tickCap = value; }
});

/**
 * number of milliseconds since timer started
 * @member module:timer.now {integer}
 * @readonly
 */
Object.defineProperty(exports, 'now', {
  get: function () { return _now; }
});

/**
 * number of frames since timer started
 * @member module:timer.frames {integer}
 * @readonly
 */
Object.defineProperty(exports, 'frames', {
  get: function () { return _frames; }
});

/**
 * resets the timer's properties `now` and `frames` (sets them to 0)
 */
exports.reset = function () {
  _now = 0;
  _frames = 0;
};

exports.tick = function (dt) {
  if (dt > _maxTick) {
    exports.onLargeTick(dt, _maxTick);
    dt = 1;
  }

  if (dt > _tickCap) {
    dt = _tickCap;
  }

  _now += dt;
  _frames++;

  exports.onTick(dt);
};

/**
 * Starts/resumes the timer
 */
exports.start = function (minDt) {
  exports.isRunning = true;
  device.get('Timer').start(exports.tick, minDt);
};

/**
 * Stops/pauses the timer
 */
exports.stop = function () {
  exports.isRunning = false;
  device.get('Timer').stop();
};

/**
 * Computes and returns the number of milliseconds into the current frame
 * execution has progressed since the last tick (and before the next one)
 */
exports.getTickProgress = function () {
  var now = Date.now();
  return now - (Timer.last || now);
};

/**
 * Override this function to capture large ticks.  Large ticks may happen if the
 * app is backgrounded or paused.  The default behavior is to log a warning with
 * the value of the dropped tick.
 * @param largeDt {integer} number of milliseconds in the large tick
 * @param threshold {integer} current value of {@linkcode
 *     module:timer.maxTick|maxTick}
 */
exports.onLargeTick = function (largeDt, threshold) {
  logger.warn('Dropping large tick: ' + largeDt + '; Threshold is set at: '
      + threshold);
};

/**
 * Used internally by the timestep {@link Engine} for driving `tick` and
 * `render`.
 * @param _dt {integer} milliseconds since last tick
 */
exports.onTick = function (_dt) {};
