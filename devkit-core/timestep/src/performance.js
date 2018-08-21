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
 * @module performance
 *
 * Calculates device performance score by maintaining a window history of the
 * worst tick deltas and taking its average.
 *
 * Over time if the window of worst ticks is not updated, then it will periodically
 * pop off the worst deltas within the window for the performance score to rise back up.
 *
 **/
import {
  logger,
  bind
} from 'base';

import device from 'device';
import userAgent from 'userAgent';
import engine from 'ui/engine';

var DEFAULT_RANK = 0;
var DEFAULT_ALLOW_REDUCTION = true;
var DEFAULT_FPS_LOWER_BOUND = 10;
var DEFAULT_FPS_UPPER_BOUND = 60;
var MIN_SCORE = 0;
var MAX_SCORE = 100;
var TICKS_TIL_ADJUST_DPR = 500;
var MIN_DPR = 1;
var TICKS_TIL_CHECK_SCORE = 20;
var START_AVERAGE_DELTA = 16;
var START_AVERAGE_SCORE = 100;
var DELTA_AVERAGE_WEIGHT = 0.95;
var DELTA_WEIGHT = 0.05;
var SCORE_AVERAGE_WEIGHT = 0.95;
var SCORE_WEIGHT = 0.05;
var MIN_SCORE_FOR_DPR = 40;
var DPR_DECREASE_VALUE = 0.5;

var _ticksSinceLastDPRUpdate = 0;
var _ticksSinceLastScoreUpdate = 0;
var _minFPS = DEFAULT_FPS_LOWER_BOUND;
var _maxFPS = DEFAULT_FPS_UPPER_BOUND;
var _canMeasure;
var _dprScalingEnabled;
var _lastTick;
var _averageDelta = START_AVERAGE_DELTA;
var _averageScore = START_AVERAGE_SCORE;
var _averageDPR = device.screen.defaultDevicePixelRatio;

function _mapFPSToPerformanceScore (fps) {
  var fpsRange = _maxFPS - _minFPS;
  var scoreRange = MAX_SCORE - MIN_SCORE;
  var fpsPosition = fps - _minFPS;
  var valuePercentage = fpsPosition / fpsRange;
  if (valuePercentage > 1) {
    valuePercentage = 1;
  }
  return MIN_SCORE + scoreRange * valuePercentage;
}

function _calculatePerformanceScore () {
  var ticksPerSecond = 1000 / _averageDelta;
  var adjustedTicksPerSecond = Math.min(ticksPerSecond, DEFAULT_FPS_UPPER_BOUND);
  var mappedScore = _mapFPSToPerformanceScore(adjustedTicksPerSecond);

  return Math.max(0, mappedScore);
}

function onRender () {
  if (!_canMeasure) {
    return;
  }

  var now = Date.now();
  var delta = now - _lastTick;
  _lastTick = now;
  _averageDelta = _averageDelta * DELTA_AVERAGE_WEIGHT + delta * DELTA_WEIGHT;

  if (++_ticksSinceLastScoreUpdate >= TICKS_TIL_CHECK_SCORE) {
    _ticksSinceLastScoreUpdate = 0;

    var currentScore = _calculatePerformanceScore();
    _averageScore = _averageScore * SCORE_AVERAGE_WEIGHT + currentScore *
      SCORE_WEIGHT;
  }

  if (_dprScalingEnabled && ++_ticksSinceLastDPRUpdate >= TICKS_TIL_ADJUST_DPR) {
    _ticksSinceLastDPRUpdate = 0;

    if (_averageScore < MIN_SCORE_FOR_DPR && _averageDPR > MIN_DPR) {
      _averageDPR -= DPR_DECREASE_VALUE;
      device.setDevicePixelRatio(_averageDPR);
    }
  }
}

class Performance {
  constructor () {
    _canMeasure = true;
    _dprScalingEnabled = false;

    // wait until engine initialization completes before subscribing to tick
    setTimeout(bind(this, function () {
      _lastTick = Date.now();
      engine.on('Render', bind(this, onRender));
    }), 0);
  }
  showDebugLogs () {}
  hideDebugLogs () {}
  clear () {
    _averageScore = START_AVERAGE_SCORE;
    _averageDelta = START_AVERAGE_DELTA;
    _ticksSinceLastDPRUpdate = 0;
    _ticksSinceLastScoreUpdate = 0;
  }
  pause () {
    _canMeasure = false;
  }
  resume () {
    _lastTick = Date.now();
    _canMeasure = true;
  }
  setTargetFPSRange (min, max) {
    _minFPS = min;
    _maxFPS = max;
  }
  getPerformanceScore () {
    return _averageScore;
  }
  getAdjustedParticleCount (count, performanceScore, allowReduction) {
    var currCount = count;
    var mR = this.getPerformanceScore();
    var pR = performanceScore || DEFAULT_RANK;
    var aR = typeof allowReduction !== 'undefined' ? allowReduction :
      DEFAULT_ALLOW_REDUCTION;

    if (mR < pR) {
      currCount = aR ? count * mR / pR : 0;
    }

    return currCount;
  }
  setDPRScalingEnabled (value) {
    // Due to a browser bug, don't enable auto DPR scaling for iOS
    if (userAgent.OS_TYPE === 'iPhone OS') {
      logger.warn('Auto DPR not currently supported on iOS.');
      return;
    }

    _dprScalingEnabled = value;
  }
}

export default new Performance();
