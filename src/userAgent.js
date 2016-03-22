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
 * @module userAgent
 *
 * Uses navigator.userAgent and retrieves information about app runtime, device,
 * OS version, browser version, and simulator status.
 */

var UserAgent = Class(function () {
  var ua = navigator && navigator.userAgent;
  var isNative = /TeaLeaf/.test(ua);
  var isIOS = /iPod|iPhone|iPad/i.test(ua);
  var isAndroid = /Android/.test(ua);
  var isMac = /Mac OS X [0-9_]+/.test(ua);
  var isIPhoneOS = /iPhone OS/.test(ua);
  var isSafari = /Safari/.test(ua);
  var isChrome = /Chrome/.test(ua);
  var isFirefox = /Firefox/.test(ua);
  var isSimulator = GLOBAL.CONFIG && !!CONFIG.simulator;

  var appRuntime = 'unknown';
  var deviceType = 'unknown';
  var osType = 'unknown';
  var osVersion = 'unknown';
  var browserVersion = 'unknown';
  var browserType = 'unknown';

  if (isNative) {
    appRuntime = 'native';
    deviceType = 'mobile';
  } else {
    appRuntime = 'browser';
    if (isIOS || isAndroid) {
      deviceType = 'mobile';
    } else {
      deviceType= 'desktop';
    }
  }

  if (isAndroid) {
    osType = 'Android';
    osVersionString = ua.match(/Android[/\s][\d.]+/)[0];
    osVersion = osVersionString.match(/[\d.]+/)[0];
  } else if (isIPhoneOS) {
    osType = 'iPhone OS';
    osVersionString = ua.match(/iPhone OS [0-9_]+/)[0];
    osVersion = osVersionString.match(/[0-9_]+/)[0].replace(/_/g, '.');
  } else if (isMac) {
    osType = 'Mac OS X';
    osVersionString= ua.match(/Mac OS X [0-9_]+/)[0];
    osVersion = osVersionString.match(/[0-9_]+/)[0].replace(/_/g, '.');
  }

  if (isChrome) {
    browserType = 'Chrome';
    browserVersionString = ua.match(/Chrome[/\s][\d.]+/)[0];
    browserVersion = browserVersionString.match(/[\d.]+/)[0];
  } else if (isSafari) {
    browserType = 'Safari';
    browserVersionString = ua.match(/Safari[/\s][\d.]+/)[0];
    browserVersion = browserVersionString.match(/[\d.]+/)[0];
  } else if (isFirefox) {
    browserType = 'Firefox';
    browserVersionString = ua.match(/Firefox[/\s][\d.]+/)[0];
    browserVersion = browserVersionString.match(/[\d.]+/)[0];
  }

  this.USER_AGENT = ua;
  this.OS_TYPE = osType
  this.OS_VERSION = osVersion;
  this.APP_RUNTIME = appRuntime;
  this.DEVICE_TYPE = deviceType;
  this.BROWSER_TYPE = browserType;
  this.BROWSER_VERSION = browserVersion;
  this.SIMULATED = isSimulator;
});

exports = new UserAgent();
