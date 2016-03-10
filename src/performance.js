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

var DEFAULT_RANK = 0;
var DEFAULT_ALLOW_REDUCTION = true;
var LOWER_BOUND = 10;
var HIGHER_BOUND = 60;
var TICKS_TIL_INCREASE_SCORE = 200;
  
var Performance = Class(function () {
  var ticksSinceLastWorstUpdate = 0;
  var worstTicksSize = 30;
  var worstTicks = [];
  var minFPS = LOWER_BOUND;
  var maxFPS = HIGHER_BOUND;
  var lastTick;

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
  };

  this.startMeasuring = function() {
    if (!this.measuring) {
      this.measuring = true;
      if (engine === null) {
        import ui.Engine as Engine;
        engine = Engine.get();
      }
      lastTick = Date.now();
      engine.subscribe('Tick', this, 'onTick');
    }
  };

  this.stopMeasuring = function() {
    if (this.measuring) {
      this.measuring = false;
      engine.unsubscribe('Tick', this, 'onTick');
    }
  };

  this.addWorstTick = function (delta) {
    worstTicks.push(delta);
    worstTicks.sort(function(a, b) {
      return a - b;
    });

    if (worstTicks.length > worstTicksSize) {
      worstTicks.shift();
    }

    ticksSinceLastWorstUpdate = 0;
  };

  this.onTick = function(dt) {
    var now = Date.now();
    var delta = now - lastTick;
    var isWorstDelta = (worstTicks.length > 0 && delta >= worstTicks[0]);
    
    lastTick = now;
    
    if (isWorstDelta || worstTicks.length === 0) {
      this.addWorstTick(delta);
    } else {
      ticksSinceLastWorstUpdate++;
    }

    if (ticksSinceLastWorstUpdate > TICKS_TIL_INCREASE_SCORE) {
      worstTicks.pop();
      ticksSinceLastWorstUpdate = 0;
    }
  };

  this.getWorstTicksAverage = function () {
    var worstTicksAverage = 0;
    for (var i = 0; i < worstTicks.length; i++) {
      worstTicksAverage += worstTicks[i];
    }

    return worstTicksAverage /= worstTicks.length;
  };

  this.getPerformanceScore = function() {
    var worstTicksAverage = this.getWorstTicksAverage();
    var ticksPerSecond = 1000 / worstTicksAverage;
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



