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
  var isIPhoneOS = /iPhone OS [0-9_]+/.test(ua);
  
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

  var match;
  if (isAndroid) {
    osType = 'Android';
    match = ua.match(/Android[/\s][\d.]+/);
    if(match) {
       osVersionString = match[0];
       var osVersionMatch = osVersionString.match(/[\d.]+/);
       osVersion = (osVersionMatch && osVersionMatch[0]) || osVersion;
    }
  } else if (isIPhoneOS) {
    osType = 'iPhone OS';
    match = ua.match(/iPhone OS [0-9_]+/);
    if(match) {
       osVersionString = match[0];
       var osVersionMatch = osVersionString.match(/[0-9_]+/);
       osVersion = (osVersionMatch && osVersionMatch[0].replace(/_/g, '.')) || osVersion;
    }
  } else if (isMac) {
    osType = 'Mac OS X';
    match = ua.match(/Mac OS X [0-9_]+/);
    if(match) {
       osVersionString = match[0];
       var osVersionMatch = osVersionString.match(/[0-9_]+/);
       osVersion = (osVersionMatch && osVersionMatch[0].replace(/_/g, '.')) || osVersion;
    }
  }

  var browserInfo = ua.match(/(Safari|Safari Line|Chrome|Firefox)[/\s]([.0-9]+)/);

  if(browserInfo && browserInfo.length === 3) {
    browserType = browserInfo[1];
    browserVersion = browserInfo[2];
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
