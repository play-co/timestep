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
 * Measures performance.
 *
**/
import ui.Engine as Engine;

var engine = Engine.get();

var HISTORY_SIZE = 100;

var AppTick = Class(function () {
  this.init = function () {
    var history = [];
    var historyIndex = 0;
    var _lastTick = Date.now();
    engine.subscribe('Tick', this, 'onTick');
  };

  this.onTick = function(dt) {
  	var now = Date.now();
  	var delta = _lastTick - now;
  	history[historyIndex++] = delta;
  	_lastTick = now;
  };
});


exports.testPerformanceTimeWithWindow = function() {

}