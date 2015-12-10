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

import device;
from util.browser import $;

device.registerDevice('browser', 'platforms.browser');

exports.init = function () {

  var onResize = function () {
    var dpr = device.screen.devicePixelRatio;
    var doc = window.document;
    var width = (window.innerWidth || (doc.clientWidth || doc.clientWidth)) * dpr;
    var height = (window.innerHeight || (doc.clientHeight || doc.clientHeight)) * dpr;

    if (width != device.width || height != device.height || !device.screen.orientation) {
      device.width = width;
      device.height = height;
      device.screen.width = width;
      device.screen.height = height;

      if (width > height) {
        device.screen.isPortrait = false;
        device.screen.isLandscape = true;
        device.screen.orientation = 'landscape';
      } else {
        device.screen.isPortrait = true;
        device.screen.isLandscape = false;
        device.screen.orientation = 'portrait';
      }

      device.screen.publish('Resize', width, height);
    }
  };

  $.onEvent(window, 'resize', onResize, false);

  onResize();
};
