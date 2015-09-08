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

var _ctx = null;
var _bufferMap = {};
var _loadingMap = {};
var _onLoadMap = {};

/**
 * AudioContextLoader Class designed to work with HTML5 AudioContext
 */
exports = Class(function () {
	/**
	 * Requires an instance of AudioContext
	 */
	this.init = function (opts) {
		_ctx = opts.ctx;
	};

	/**
	 * Load audio files from a list of urls, call callback when all are loaded
	 */
	this.load = function (urls, callback) {
		var batch = {
			fileCount: urls.length,
			loadedCount: 0,
			buffers: [],
			callback: callback || function () {
				logger.log("Finished loading audio files:", urls);
			}
		};

		for (var i = 0, len = urls.length; i < len; i++) {
			this._loadFile(urls[i], i, batch);
		}
	};

	/**
	 * Load an individual audio file asynchronously
	 */
	this._loadFile = function (url, index, batch) {
		var ctx = _ctx;
		var bufferMap = _bufferMap;
		var loadingMap = _loadingMap;
		var onLoadMap = _onLoadMap;
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = "arraybuffer";
		request.onload = function () {
			ctx.decodeAudioData(
				request.response,
				function (buffer) {
					if (!buffer) {
						logger.error("Error decoding audio file data:", url);
					} else {
						loadingMap[url] = false;
						batch.buffers[index] = bufferMap[url] = buffer;
						// batch callback for preloading
						if (++batch.loadedCount === batch.fileCount) {
							batch.callback(batch.buffers);
						}
						// on load callbacks for individual sounds
						var cb = onLoadMap[url];
						if (cb) {
							cb([buffer]);
							onLoadMap[url] = null;
						}
					}
				},
				function (error) {
					logger.error("Error with AudioContext decodeAudioData:", error);
				}
			);
		};
		request.onerror = function () {
			logger.error("Error with audio XHR on URL:", url);
		};

		loadingMap[url] = true;
		request.send();
	};

	this.getAudioContext = function () {
		return _ctx;
	};

	this.setAudioContext = function (ctx) {
		_ctx = ctx;
	};

	this.getBuffer = function (url) {
		return _bufferMap[url] || null;
	};

	this.isLoading = function (url) {
		return _loadingMap[url] || false;
	};

	this.doOnLoad = function (url, cb) {
		if (this.isLoading(url)) {
			_onLoadMap[url] = cb;
		} else {
			var buffer = this.getBuffer(url);
			if (buffer) {
				cb([buffer]);
			} else {
				this.load([url], cb);
			}
		}
	};
});
