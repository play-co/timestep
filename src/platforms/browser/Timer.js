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

var _onTick = null,
	disableRequestAnimFrame = false,
	disablePostMessage = true,
	asFastAsPossible = false,
	MIN_DT = 16;

if (window.postMessage) {
	function postMessageCb(evt) { if (evt.data == 'timestep.TICK') { onFrame(); }}
	
	if (window.addEventListener) {
		window.addEventListener('message', postMessageCb, false);
	} else {
		window.attachEvent('onmessage', postMessageCb);
	}
} else {
	disablePostMessage = true;
	tickNow = sendTimeoutNow;
}

function sendPostMessage() { window.postMessage('timestep.TICK', '*'); }
function sendTimeout() { setTimeout(onFrame, MIN_DT); }
function sendTimeoutNow() { setTimeout(onFrame, 0); }

var fastDriver = sendTimeoutNow,
	mainDriver = sendTimeout,
	cancelDriver,
	driverId;

if (asFastAsPossible) {
	if (!disablePostMessage) {
		fastDriver = mainDriver = sendPostMessage;
	} else {
		mainDriver = sendTimeoutNow;
	}
} else {
	var reqAnim = window.requestAnimationFrame;
	var cancelAnim = window.cancelAnimationFrame;
	var prefixes = ['', 'webkit', 'moz', 'o', 'ms'];

	if (!disableRequestAnimFrame) {
		for (var i = 0; i < prefixes.length && !reqAnim; ++i) {
			reqAnim = window[prefixes[i] + 'RequestAnimationFrame'];
			cancelAnim = window[prefixes[i] + 'CancelAnimationFrame'] || window[prefixes[i] + 'CancelRequestAnimationFrame'];
		}
	}

	if (reqAnim) {
		fastDriver = mainDriver = reqAnim;
		cancelDriver = cancelAnim;
	} else if (!disablePostMessage) {
		fastDriver = sendPostMessage;
	}
}

/*
var frameDts = [];
var print = false, frames = 0, lastPrint = 0;
setInterval(function () { print = true; }, 1000)

var slow = 0, fast = 0;
*/

function onFrame() {
	if (_onTick) {
		var now = +new Date(),
			dt = now - (exports.last || now);
		
		exports.last = now;
		
		//try {
			_onTick(dt);
		/*} catch (e) {
			if (window.DEV_MODE) {
				var err = '.dev_error';
				jsio('import ' + err).render(e);
				exports.stop();
			}
		}*/

		/*
		frameDts.push(dt);
		var delay = +new Date() - now;
		++frames;
		if (print) {
			logger.log(fast, slow, JSON.stringify(frameDts), now - lastPrint, dt, frames, delay);
			frameDts = [];
			lastPrint = now;
			print = false;
			frames = 0;
			slow = 0;
			fast = 0;
		}
		*/

		if (dt > MIN_DT) {
		//	++fast;
			driverId = fastDriver.call(window, onFrame);
		} else {
		//	++slow;
			driverId = mainDriver.call(window, onFrame);
		}
	}
}

exports.last = null;

exports.start = function (onTick) {
	_onTick = onTick;
	driverId = mainDriver.call(window, onFrame);
}

exports.stop = function () {
	_onTick = null;
	if (driverId) {
		cancelDriver.call(window, driverId);
		driverId = null;
	}
}
