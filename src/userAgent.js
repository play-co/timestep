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
 * Uses navigator.userAgent and retrieves information about app runtime, device, OS version,
 * simulator, and browser version.
 *
 */

var ua = navigator && navigator.userAgent;
exports.ua = ua; //for debug: delete later

//Determine runtime
var isNative = /TeaLeaf/.test(ua);
exports.APP_RUNTIME = isNative ? 'native' : 'browser';

var isIOS = /iPod|iPhone|iPad/i.test(ua);
var isAndroid = /Android/.test(ua);


//Determine runtime and device type.
if (isNative) {
  exports.APP_RUNTIME = 'native';
  exports.DEVICE_TYPE = 'mobile';
} else {
  exports.APP_RUNTIME = 'browser';
  if (isIOS || isAndroid) {
    exports.DEVICE_TYPE = 'mobile';
  } else {
    exports.DEVICE_TYPE = 'desktop';
  }
}

//Determine OS type.
var isMac = /Mac OS X [0-9_]+/.test(ua);
var isIPhoneOS = /iPhone OS/.test(ua);
var osType = 'unknown';

if (isAndroid) {
  osType = 'Android';
} else if (isIPhoneOS) {
  osType = 'iOS';
} else if (isMac) {
  osType = ua.match(/Mac OS X [0-9_]+/)[0];
} 
exports.OS_TYPE = osType;

var browserVersion = 'unknown';
var isSafari = /Safari/.test(ua);
var isChrome = /Chrome/.test(ua);
var isFirefox = /Firefox/.test(ua);
if (isChrome) {
  browserVersion = ua.match(/Chrome[/\s][\d.]+/)[0];
} else if (isSafari) {  
  browserVersion = ua.match(/Safari[/\s][\d.]+/)[0];
} else if (isFirefox) {
  browserVersion = ua.match(/Firefox[/\s][\d.]+/)[0];
}

exports.BROWSER_VERSION = browserVersion;

var isSimulator = GLOBAL.CONFIG && !!CONFIG.simulator;
exports.SIMULATED = isSimulator;



// This is the desired API
//exports.APP_RUNTIME = "browser" or "mobile";
//exports.DEVICE_TYPE = "mobile" or "desktop";
//exports.OS_TYPE = "iOS" or "Android" or ...
//exports.SIMULATED = true or false