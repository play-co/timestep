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
 * @module performanceMetric
 *
 * Measures performance by keeping a window of delta times and providing a score using that window.
 *
**/

var engine = null;
var floor = Math.floor;

var DEFAULT_RANK = 0;
var DEFAULT_ALLOW_REDUCTION = true;
var LOWER_BOUND = 10;
var HIGHER_BOUND = 60;
var TICKS_TIL_INCREASE_SCORE = 500;
  
var Performance = Class(function () {
  this.historySize = 50;
  this.worstTicksSize = 10;
  this.ticksSinceLastWorstUpdate = 0;
  var _lastTick = Date.now();
  var _history = [];
  var _worstTicks = [];
  var historyIndex = 0;
  var minFPS = LOWER_BOUND;
  var maxFPS = HIGHER_BOUND;

  var resetHistory = function () {
    _history = [];
    historyIndex = 0;
  };

  var _map = function(val, start1, stop1, start2, stop2) {
    var range1 = stop1 - start1;
    var range2 = stop2 - start2;
    var valPosition = val - start1;
    var valuePercentage = valPosition / range1;
    return start2 + range2 * valuePercentage;
  };

  this.init = function () {
    this.measuring = false;
  };

  this.setTargetFPSRange = function (min, max) {
    minFPS = min;
    maxFPS = max;
    this.resetHistory();
  };

  this.startMeasuring = function() {
    if (!this.measuring) {
      this.measuring = true;
      if (engine === null) {
        import ui.Engine as Engine;
        engine = Engine.get();
      }
      _lastTick = Date.now();
      engine.subscribe('Tick', this, 'onTick');
    }
  };

  this.stopMeasuring = function() {
    if (this.measuring) {
      this.measuring = false;
      engine.unsubscribe('Tick', this, 'onTick');
    }
  };

  this.onTick = function(dt) {
    var now = Date.now();
    var delta = now - _lastTick;
    _history[historyIndex++] = delta;
    if (historyIndex >= this.historySize) {
      historyIndex = 0;
    }
    _lastTick = now;
    if (_worstTicks.length > 0 && delta >= _worstTicks[0]) {
      ticksSinceLastWorstUpdate = 0;
      _worstTicks.push(delta);
      _worstTicks.sort();
      if (_worstTicks.length > worstTicksSize) {
        _worstTicks.shift();
      }
    } else {
      ticksSinceLastWorstUpdate++;
    }
    if (ticksSinceLastWorstUpdate > TICKS_TIL_INCREASE_SCORE) {
      _worstTicks.pop();
    }
  };

  this.getAverageTicksSpeed = function() {
    var result = 0;
    for (var i = 0; i < _history.length; i++) {
      result += _history[i];
    }
    result /= _history.length;
    return result;
  };

  this.getPerformanceScore = function() {
    var tickSpeed = this.getAverageTicksSpeed();
    var ticksPerSecond = 1000 / tickSpeed;
    var adjustedTicksPerSecond = Math.min(ticksPerSecond, 60);
    var mappedScore = _map(adjustedTicksPerSecond, minFPS, maxFPS, 0, 100);
    return Math.max(0, mappedScore);
  };

  this.getPerformanceScoreTwo = function() {
    var worstTicksAverage = 0;
    for (var i = 0; i < _history.length; i++) {
      worstTicksAverage += _worstTicks[i];
    }
    worstTicksAverage /= _worstTicks.length;
    var ticksPerSecond = 1000 / tickSpeed;
    var adjustedTicksPerSecond = Math.min(ticksPerSecond, 60);
    var mappedScore = _map(adjustedTicksPerSecond, minFPS, maxFPS, 0, 100);
    return Math.max(0, mappedScore);
  };

  this.getAdjustedParticleCount = function(count, performanceRank, allowReduction) {
    var currCount = count;
    var mR = this.getPerformanceScore();
    var pR = performanceRank || DEFAULT_RANK;
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
});

exports = new Performance();



