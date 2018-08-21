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
 * package timestep.env.browser.Timer;
 *
 * System timer exposed to the device.
 */

var _onTick = null;
var requestID;

var requestAnimationFrame = window.requestAnimationFrame;
var cancelAnimationFrame = window.cancelAnimationFrame;
var prefixes = [
  '',
  'webkit',
  'moz',
  'o',
  'ms'
];

for (var i = 0; i < prefixes.length && !requestAnimationFrame; ++i) {
  requestAnimationFrame = window[prefixes[i] + 'RequestAnimationFrame'];
  cancelAnimationFrame = window[prefixes[i] + 'CancelAnimationFrame'] || window[
    prefixes[i] + 'CancelRequestAnimationFrame'];
}

function onFrame () {
  if (_onTick) {
    var now = Date.now();
    var dt = now - exports.last;

    exports.last = now;

    requestID = requestAnimationFrame(onFrame);

    _onTick(dt);
  }
}

exports.last = 0;

exports.start = function (onTick) {
  _onTick = onTick;
  exports.last = Date.now();
  requestID = requestAnimationFrame(onFrame);
};

exports.stop = function () {
  _onTick = null;
  if (requestID) {
    cancelAnimationFrame(requestID);
    requestID = null;
  }
};

export default exports;
