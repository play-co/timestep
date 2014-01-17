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

import event.Emitter as Emitter;
import util.setProperty;

if (typeof navigator == 'undefined' || !navigator.userAgent) {
	logger.warn('> Timestep was unable to determine your device! Please check that navigator.userAgent is defined.');
	exports = {isUnknown: true};
}

var ua = navigator.userAgent;

/**
 * @namespace
 */

var _devices = {}
exports.registerDevice = function (name, path) {
	_devices[name] = path;
}

exports.get = function (module) {
	var path = _devices[exports.name] || 'platforms.browser';
	return jsio('import ' + path + '.' + module, {dontExport: true, suppressErrors: true});
};

exports.importUI = function (module) {
	return jsio('import ui.backend.' + (exports.useDOM ? 'dom' : 'canvas') + '.' + module, {dontExport: true, suppressErrors: true});
};

exports.isMobileNative = exports.isMobile = /TeaLeaf/.test(ua);

logger.log(exports.isMobile ? 'on mobile device' : 'in web browser');

exports.screen = new Emitter();

var devicePixelRatio = window.devicePixelRatio || 1;

// @deprecated
exports.devicePixelRatio = devicePixelRatio;

exports.screen.devicePixelRatio = devicePixelRatio;
exports.screen.width = window.screen.width * devicePixelRatio;
exports.screen.height = window.screen.height * devicePixelRatio;

// This is stubbed out unless available on the current device.
exports.hideAddressBar = function () {};

util.setProperty(exports, 'defaultFontFamily', {
	cb: function (value) {
		import ui.resource.Font;
		ui.resource.Font.setDefaultFontFamily(value);
	},
	value: 'Helvetica'
});
exports.defaultFontWeight = "";

if ('ontouchstart' in window && (!/BlackBerry/.test(ua))) {
	exports.events = {
		start: 'touchstart',
		move: 'touchmove',
		end: 'touchend'
	};
} else {
	exports.events = {
		start: 'mousedown',
		move: 'mousemove',
		end: 'mouseup'
	};
}

exports.isMobileBrowser = false;
exports.isUIWebView = false;
exports.isSafari = /Safari/.test(ua);

import std.uri;
uri = new std.uri(window.location);
exports.isSimulator = !!(uri.query('device') || uri.hash('device'));

if (exports.isSimulator) {
	var urlStr = window.location.href.toLowerCase();
	exports.isIOSSimulator = urlStr.indexOf('ipad') !== -1 || urlStr.indexOf('iphone') !== -1;

	// Until we support more platforms, if it's not
	// iOS then it's assumed to be an Android device
	exports.isAndroidSimulator = !exports.isIOSSimulator;
} else {
	exports.isAndroidSimulator = false;
	exports.isIOSSimulator = false;
}

if (exports.isMobile) {
	exports.name = 'tealeaf';
	exports.width = navigator.width;
	exports.height = navigator.height;
	exports.isAndroid = /Android/.test(ua);
	if (exports.isAndroid) {
		exports.isTablet = navigator.width/devicePixelRatio >= 600;
	} else {
		exports.isIPad = exports.isTablet = /iPad/.test(ua);
		exports.isIPhone = /iPhone/.test(ua);

		// Until we support more platforms, if it's not
		// Android then it's assumed to be an iOS device
		exports.isIOS = true;
	}
} else {
	if (/(iPod|iPhone|iPad)/i.test(ua)) {
		exports.name = 'browser';
		exports.isMobileBrowser = true;
		exports.isIOS = true;

		var match = ua.match(/iPhone OS ([0-9]+)/);
		exports.iosVersion = match && parseInt(match[1]);
		exports.isUIWebView = !exports.isSafari;

		exports.screen.defaultOrientation = 'portrait';
		exports.screen.browserChrome = {
			portrait: {top: 20 * devicePixelRatio, bottom: 44 * devicePixelRatio},
			landscape: {top: 20 * devicePixelRatio, bottom: 32 * devicePixelRatio}
		};

	} else if (/Mobile Safari/.test(ua) || /Android/.test(ua) || /BlackBerry/.test(ua)) {
		exports.name = 'browser';
		exports.isMobileBrowser = true;
		exports.isAndroid = true;

		exports.screen.width = window.outerWidth;
		exports.screen.height = window.outerHeight - 1;

		exports.screen.defaultOrientation = 'portrait';
		exports.screen.browserChrome = {
			portrait: {top: 0, bottom: 0},
			landscape: {top: 0, bottom: 0}
		};
	} else {
		// All other browsers
		exports.screen.width = window.innerWidth;
		exports.screen.height = window.innerHeight;
		exports.name = 'browser';
		exports.canResize = false;
	}

	// Set up device.width and device.height for browser case
	exports.width = exports.screen.width;
	exports.height = exports.screen.height;
}

exports.useDOM = false;
exports.setUseDOM = function (useDOM) {
	return;
	if (exports.useDOM != useDOM) {
		exports.useDOM = useDOM;

		import ui.View as View;
		var backing = exports.importUI('ViewBacking');
		View.setDefaultViewBacking(backing);
	}
}

exports.getDimensions = function (isLandscape) {
	var dMin = Math.min(exports.width, exports.height),
		dMax = Math.max(exports.width, exports.height);

	return isLandscape
		? {height: dMin, width: dMax}
		: {height: dMax, width: dMin};
}

/**
 * Initialize the device. Called from somewhere else.
 */

exports.init = function () {
	import ui.init;
	exports.get('initialize').init();
	exports.screen.width = exports.width;
	exports.screen.height = exports.height;
}

/**
 * Event handlers
 */
exports.setBackButtonHandler = function (handler) {
	NATIVE && (NATIVE.onBackButton = handler);
}

exports.setRotationHandler = function (handler) {
	NATIVE && (NATIVE.onRotation = handler);
}

/*
 * Stay awake
 */
exports.stayAwake = function(enable) {
	NATIVE && NATIVE.stayAwake && NATIVE.stayAwake(enable);
}

/**
 * Garbage Collection
 */
exports.collectGarbage = function () {
	logger.log('collecting garbage');
	NATIVE && NATIVE.gc && NATIVE.gc.runGC();
}

/**
 * Global device accessibility controls. Muting, click, color, font changing, etc.
 */

GLOBAL.ACCESSIBILITY = new (Class(Emitter, function (supr) {
	this.muted = false;

	this.mute = function (flag) {
		this.muted = flag;
		this.publish('MuteChange');
	};
}));

if (GLOBAL.ONACCESSIBLE) {
	GLOBAL.ONACCESSIBLE();
}
