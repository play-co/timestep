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

var DEFAULT_RANK = 0;
var DEFAULT_ALLOW_REDUCTION = true;
var DEFAULT_FPS_LOWER_BOUND = 10;
var DEFAULT_FPS_UPPER_BOUND = 60;
var MAX_WORST_TICKS_AMOUNT = 30;
var MAX_SCORE = 100;
var MIN_SCORE = 0;
var TICKS_TIL_INCREASE_SCORE = 200;
  
var Performance = Class(function () {
  var _ticksSinceLastWorstUpdate = 0;
  var _worstTicks = [];
  var _minFPS = DEFAULT_FPS_LOWER_BOUND;
  var _maxFPS = DEFAULT_FPS_UPPER_BOUND;
  var _canMeasure;
  var _lastTick;

  function _mapFPSToPerformanceScore (fps) {
    var range1 = _maxFPS - _minFPS;
    var range2 = MAX_SCORE - MIN_SCORE;
    var fpsPosition = fps - _minFPS;
    var valuePercentage = fpsPosition / range1;
    return MIN_SCORE + range2 * valuePercentage;
  };

  function _addWorstTick (delta) {
    _worstTicks.push(delta);
    _worstTicks.sort(function(a, b) {
      return a - b;
    });

    if (_worstTicks.length > MAX_WORST_TICKS_AMOUNT) {
      _worstTicks.shift();
    }

    _ticksSinceLastWorstUpdate = 0;
  };

  function _getWorstTicksAverage () {
    if (_worstTicks.length === 0) { return 0; }

    var worstTicksAverage = 0;

    for (var i = 0; i < _worstTicks.length; i++) {
      worstTicksAverage += _worstTicks[i];
    }

    return worstTicksAverage /= _worstTicks.length;
  };

  function onTick (dt) {
    if (!_canMeasure) { return; }

    var now = Date.now();
    var delta = now - _lastTick;
    var isWorstDelta = (_worstTicks.length > 0 && delta >= _worstTicks[0]);
    
    _lastTick = now;
    
    if (isWorstDelta || _worstTicks.length === 0) {
      _addWorstTick(delta);
    } else {
      _ticksSinceLastWorstUpdate++;
    }

    if (_ticksSinceLastWorstUpdate > TICKS_TIL_INCREASE_SCORE) {
      _worstTicks.pop();
      _ticksSinceLastWorstUpdate = 0;
    }
  };

  /**
   * @method clear - clears all the information saved by past measures
   */
  this.clear = function () {
    _worstTicks = [];
    _ticksSinceLastWorstUpdate = 0;
  };

  /**
   * @method pause - pause the score measurement
   */
  this.pause = function () {
    _canMeasure = false;
  };

  /**
   * @method resume - resume the score measurement
   */
  this.resume = function () {
    _lastTick = Date.now();
    _canMeasure = true;
  };

  /**
   * @method setTargetFPSRange - sets the range of FPS used to calculate the score 
   *   @arg {number} min - minimum value with a score of 0
   *   @arg {number} max - maximum value with a score of 100
   */
  this.setTargetFPSRange = function (min, max) {
    _minFPS = min;
    _maxFPS = max;
  };

  /**
   * @method getPerformanceScore - sets the range of FPS used to calculate the score 
   */
  this.getPerformanceScore = function () {
    var worstTicksAverage = _getWorstTicksAverage();
    var ticksPerSecond = 1000 / worstTicksAverage;
    var adjustedTicksPerSecond = Math.min(ticksPerSecond, 60);
    var mappedScore = _mapFPSToPerformanceScore(adjustedTicksPerSecond);

    return Math.max(0, mappedScore);
  };

  /**
   * @method getAdjustedParticleCount - returns a number of particles depending 
   *   on the current performance score to improve performance
   * @arg {number} count - number of particles that are going to be adjusted
   * @arg {number} performanceScore - threshold for the calculations
   * @arg {boolean} allowReduction - boolean used to define if the particles are 
   *   going to be reduced or totally disabled
   * @returns {number} count - number of particles 
   */
  this.getAdjustedParticleCount = function (count, performanceScore, allowReduction) {
    var currCount = count;
    var mR = this.getPerformanceScore();
    var pR = performanceScore || DEFAULT_RANK;
    var aR = (typeof allowReduction !== 'undefined')
      ? allowReduction
      : DEFAULT_ALLOW_REDUCTION;

    if (mR < pR) {
      currCount = (aR)
        ? count * mR / pR
        : 0;  
    } 

    return currCount;
  }; 

  this.init = function () {
    _canMeasure = true;

    // wait until engine initialization completes before subscribing to tick
    setTimeout(bind(this, function () {
      _lastTick = Date.now();
      jsio('import ui.Engine').get().on('Tick', bind(this, onTick));
    }), 0);
  }; 
});

exports = new Performance();



