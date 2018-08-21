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
 * @module device;
 *
 * Namespace for the current device. Determines what device we're running using
 * navigator.userAgent. This namespace exposes various properties about the
 * current device, such as screen size, mobile/browser, pixel ratios, etc.
 *
 * Using device.get('...') imports device-specific implementations from
 *   timestep.env.* by default, or from packages registered using
 *   registerDevice().
 * Using device.importUI('...') imports rendering classes for DOM or canvas.
 *
 * @doc http://doc.gameclosure.com/api/device.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/device.md
 */
import {
  logger,
  GLOBAL,
  CONFIG
} from 'base';

import Emitter from 'event/Emitter';
import browser from 'util/browser';

if (typeof navigator === 'undefined' || !navigator.userAgent) {
  logger.warn(
    'Timestep was unable to determine your device! Please check that navigator.userAgent is defined.'
  );
  exports = { isUnknown: true };
}

var ua = navigator.userAgent;

var MAX_DPR = 2;
/// #if PLATFORM == 'wc'
MAX_DPR = 1;
/// #endif

exports.get = function () {
  console.error('noooo!');
};

exports.screen = new Emitter();

// When in simulator, use provided dpr
let devicePixelRatio = window.devicePixelRatio || 1;
if (CONFIG.simulator && CONFIG.simulator.deviceId) {
  devicePixelRatio = CONFIG.simulator.deviceInfo.devicePixelRatio || 1;
}

// @deprecated
devicePixelRatio = Math.min(MAX_DPR, devicePixelRatio);
exports.devicePixelRatio = devicePixelRatio;

exports.screen.defaultDevicePixelRatio = devicePixelRatio;
exports.screen.devicePixelRatio = devicePixelRatio;
exports.screen.width = window.innerWidth * devicePixelRatio;
exports.screen.height = window.innerHeight * devicePixelRatio;


// FIXME: this does not apply browser specific logic to reads of
// `window.innerWidth` or `window.innerHeight`
exports.setDevicePixelRatio = function (value) {
  exports.devicePixelRatio = exports.screen.devicePixelRatio = value;

  var width = Math.floor(window.innerWidth * value);
  var height = Math.floor(window.innerHeight * value);
  exports.width = exports.screen.width = width;
  exports.height = exports.screen.height = height;
  exports.screen.publish('Resize', width, height);
};

// This is stubbed out unless available on the current device.
exports.hideAddressBar = function () {};

exports.defaultFontFamily = 'Helvetica';
exports.defaultFontWeight = '';

/*
 * All userAgent flags in this file are now DEPRECATED.
 * Please use "src/userAgent.js" for a more accurate description of your device.
 */
exports.isMobileBrowser = false;
exports.isUIWebView = false;
exports.isSafari = /Safari/.test(ua);

exports.isSimulator = GLOBAL.CONFIG && !!CONFIG.simulator;
if (exports.isSimulator) {
  exports.isIOSSimulator = /iphone|ipod|ipad/i.test(CONFIG.simulator.deviceType);

  // Until we support more platforms, if it's not
  // iOS then it's assumed to be an Android device
  exports.isAndroidSimulator = !exports.isIOSSimulator;
} else {
  exports.isAndroidSimulator = false;
  exports.isIOSSimulator = false;
}

if (/(iPod|iPhone|iPad)/i.test(ua)) {
  exports.isMobileBrowser = true;
  exports.isIOS = true;
  exports.isIpad = /iPad/i.test(ua);
  exports.isStandalone = !!window.navigator.standalone;

  // full-screen
  var match = ua.match(/iPhone OS ([0-9]+)/);
  exports.iosVersion = match && parseInt(match[1]);
  exports.isUIWebView = !exports.isSafari;

  exports.screen.defaultOrientation = 'portrait';
  exports.screen.browserChrome = {
    portrait: {
      top: 20 * devicePixelRatio,
      bottom: 44 * devicePixelRatio
    },
    landscape: {
      top: 20 * devicePixelRatio,
      bottom: 32 * devicePixelRatio
    }
  };
} else if (/Mobile Safari/.test(ua) || /Android/.test(ua) || /BlackBerry/.test(ua)) {
  exports.isMobileBrowser = true;
  exports.isAndroid = true;

  exports.screen.width = window.outerWidth;
  exports.screen.height = window.outerHeight - 1;

  exports.screen.defaultOrientation = 'portrait';
  exports.screen.browserChrome = {
    portrait: {
      top: 0,
      bottom: 0
    },
    landscape: {
      top: 0,
      bottom: 0
    }
  };
} else {
  // All other browsers
  exports.screen.width = window.innerWidth * devicePixelRatio;
  exports.screen.height = window.innerHeight * devicePixelRatio;
  exports.canResize = false;
}

// Set up device.width and device.height for browser case
exports.width = exports.screen.width;
exports.height = exports.screen.height;

exports.getDimensions = function (isLandscape) {
  var dMin = Math.min(exports.width, exports.height),
    dMax = Math.max(exports.width, exports.height);

  return isLandscape ? {
    height: dMin,
    width: dMax
  } : {
    height: dMax,
    width: dMin
  };
};


/**
 * Initialize the device. Called from somewhere else.
 */
exports.init = function () {
  var onResize = function () {
    var dpr = exports.screen.devicePixelRatio;
    var doc = window.document;
    var docElement = doc.documentElement;
    var width = ((docElement && docElement.clientWidth) || doc.clientWidth || window.innerWidth) * dpr;
    var height = ((docElement && docElement.clientHeight) || doc.clientHeight || window.innerHeight) * dpr;

    /// #if PLATFORM === 'line'
    // substract the LINE header height
    height -= 44 * dpr;
    /// #endif

    if (width !== exports.width || height !== exports.height || !exports.screen.orientation) {
      exports.width = width;
      exports.height = height;
      exports.screen.width = width;
      exports.screen.height = height;

      if (width > height) {
        exports.screen.isPortrait = false;
        exports.screen.isLandscape = true;
        exports.screen.orientation = 'landscape';
      } else {
        exports.screen.isPortrait = true;
        exports.screen.isLandscape = false;
        exports.screen.orientation = 'portrait';
      }

      exports.screen.publish('Resize', width, height);
    }
  };

  window.addEventListener('resize', onResize, false);

  onResize();

  exports.screen.width = exports.width;
  exports.screen.height = exports.height;
};

export default exports;
