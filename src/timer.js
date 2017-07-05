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
 * @module timer
 *
 * Implements an independent, singleton timer for use by the environment.
 * The Application Engine binds to this to generate the rendering tick.
 */
import {
  logger,
  CONFIG
} from 'base';

import Timer from 'platforms/browser/Timer';

// ticks over 10 seconds will be considered too large to process
exports.now = 0;
exports.frames = 0;
exports.reset = function () {
  this._last = null;
};

var MAX_TICK = CONFIG.maxTick;

exports.tick = function (dt) {
  if (dt > MAX_TICK) {
    dt = MAX_TICK;
  }

  exports.now += dt;
  exports.frames++;
  exports.onTick(dt);
};

/**
 * If our computer falls asleep, dt might be an insanely large number.
 * If we're running a simulation of sorts, we don't want the computer
 * to freeze while computing 1000s of simulation steps, so just drop
 * this tick.  Anyone who is interested can listen for a call to 'onLargeTick'
 */
exports.onLargeTick = function (largeDt, threshold) {
  logger.warn('Dropping large tick: ' + largeDt + '; Threshold is set at: ' +
    threshold);
};

exports.onTick = function (dt) {};

exports.debug = false;

// TODO: <jsio>('from iOS import start as exports.start, stop as exports.stop');
exports.start = function (minDt) {
  this.reset();
  this.isRunning = true;
  Timer.start(exports.tick, minDt);
};

exports.stop = function () {
  this.reset();
  this.isRunning = false;
  Timer.stop();
};

exports.getTickProgress = function () {
  var now = +new Date();
  return -(Timer.last || now) + now;
};

export default exports;
