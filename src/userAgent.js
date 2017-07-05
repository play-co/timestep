let exports = {};

import { GLOBAL, CONFIG } from 'base';

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
var ua = navigator && navigator.userAgent;
var isIOS = /iPod|iPhone|iPad/i.test(ua);
var isAndroid = /Android/.test(ua);
var isMac = /Mac OS X [0-9_]+/.test(ua);
var isIPhoneOS = /iPhone OS/.test(ua);
var isSafari = /Safari/.test(ua);
var isChrome = /Chrome/.test(ua);
var isFirefox = /Firefox/.test(ua);
var isIE = /MSIE/.test(ua);
var isIE11 = /Trident/.test(ua);
var isEdge = /Edge/.test(ua);
var isSimulator = GLOBAL.CONFIG && !!CONFIG.simulator;

var appRuntime = 'browser';
var deviceType = (isIOS || isAndroid) ? 'mobile' : 'desktop';
var osType = 'unknown';
var osVersion = 'unknown';
var osVersionString = 'unknown';
var browserVersion = 'unknown';
var browserVersionString = 'unknown';
var browserType = 'unknown';

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
  osVersionString = ua.match(/Mac OS X [0-9_]+/)[0];
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
} else if (isIE) {
  browserType = 'Internet Explorer';
} else if (isIE11) {
  browserType = 'Internet Explorer';
} else if (isEdge) {
  browserType = 'Edge';
}

class UserAgent {

}

UserAgent.prototype.USER_AGENT = ua;
UserAgent.prototype.OS_TYPE = osType;
UserAgent.prototype.OS_VERSION = osVersion;
UserAgent.prototype.APP_RUNTIME = appRuntime;
UserAgent.prototype.DEVICE_TYPE = deviceType;
UserAgent.prototype.BROWSER_TYPE = browserType;
UserAgent.prototype.BROWSER_VERSION = browserVersion;
UserAgent.prototype.SIMULATED = isSimulator;
exports = new UserAgent();

export default exports;
