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

	var onResize;

	if (device.isMobileBrowser) {
		device.setUseDOM(true);

		var screen = device.screen;
		if (device.isIOS || device.isAndroid) {
			
			var _isFocused = false;
			window.addEventListener('focus', function (e) {
				var tag = e.target.tagName;
				if (tag == 'TEXTAREA' || tag == 'INPUT') {
					_isFocused = true;
				}
			}, true);
			
			document.addEventListener('blur', function (e) {
				if (_isFocused) {
					_isFocused = false;
				}
			}, true);
			
			device.hideAddressBar = function () {
				if (_isFocused || !device.isMobileBrowser || !(device.isIOS || device.isAndroid)) { return; }
				if (device.isIOS) {
					window.scrollTo(0, 1);
					window.scrollTo(0, 0);
				} else {
					window.scrollTo(0, -1);
				}
			}
			
			if (!CONFIG.unlockViewport) {
				window.addEventListener('touchstart', bind(device, 'hideAddressBar'), true);
			}
		}
		
		var lastWidth, lastHeight, lastOrientation;
		onResize = function () {
			if (device.isIOS) {
				device.hideAddressBar();
			}
			
			var w = window.outerWidth;
			var h = window.outerHeight;
			var o = window.orientation;
			if (lastWidth == w && lastHeight == h && lastOrientation == o) { return; }
			
			lastWidth = w;
			lastHeight = h;
			lastOrientation = o;
			
			var isPortrait = screen.isPortrait = (h > w);
			var isLandscape = screen.isLandscape = !screen.isPortrait;
			
			var totalW = (isPortrait ? screen.width : screen.height);
			var totalH = (isPortrait ? screen.height : screen.width);
	//		document.body.style.height = Math.max(screen.width, screen.height) + 'px';
	//		device.hideAddressBar();

			var innerWidth = window.innerWidth;
			var innerHeight = window.innerHeight;
			if (device.width != innerWidth || device.height != innerHeight || device.orientation != o) {
				device.width = innerWidth;
				device.height = innerHeight;
				device.orientation = o;
				device.screen.publish('Resize', device.width, device.height, device.orientation);
			}
		}
	} else {
		onResize = function () {
			var doc = window.document,
				width = window.innerWidth || (doc.clientWidth || doc.clientWidth),
				height = window.innerHeight || (doc.clientHeight || doc.clientHeight);
			
			if (width != device.width || height != device.height) {
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
		}
	}

	$.onEvent(window, 'resize', onResize, false);
	$.onEvent(window, 'orientationchange', onResize, false);

	onResize();
};
