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
 * @package env.browser.FontBuffer;
 *
 * ??? What the hell is this
 */

import device;

var randomColorElement = function () {
	var e = Math.floor(Math.random() * 255).toString(16);
	return ((e.length === 1) ? '0' : '') + e;
};

var randomColor = function () {
	return '#' + randomColorElement() + randomColorElement() + randomColorElement();
};

var FontBuffer = exports = Class(function () {
	this.init = function (opts) {
		// 8 * 24
		// 10 * 32
		// 8 * 64
		var lineSizes = [{size: 24, count: 8}, {size: 32, count: 10}, {size: 64, count: 8}],
			lineSize,
			lines,
			item,
			y = 0,
			i, j;

		this._canvas = document.createElement('canvas');
		this._canvas.width = 1024;
		this._canvas.height = 1024;
		this._ctx = this._canvas.getContext('2d');

		this._list = [];
		for (i = 0; i < lineSizes.length; i++) {
			lines = [];
			lineSize = lineSizes[i];

			for (j = 0; j < lineSize.count; j++) {
				item = {
					previous: null,
					next: null,
					x: 0,
					y: y,
					width: 1024,
					height: 0,
					hash: null,
					frame: 0,
					refresh: true,
					ctx: this._ctx
				};
				lines.push(item);
				y += lineSize.size;
			}

			this._list.push({
				size: lineSize.size,
				lines: lines
			});
		}

		this._hashMap = {};

		this._currentFrame = 0;
		this._frameTimeout = 3;

		jsio('import ui.Engine').get().subscribe('Tick', this, this._onTick);
	};

	this._onTick = function (dt) {
		this._currentFrame++;

		var remove,
			currentFrame = this._currentFrame,
			frameTimeout = this._frameTimeout,
			list = this._list,
			lines,
			item,
			i, j, k, l;

		for (i = 0, j = list.length; i < j; i++) {
			lines = list[i].lines;
			for (k = 0, l = lines.length; k < l; k++) {
				item = lines[k];
				while (item) {
					if (item.hash === null) {
						if (item.next && (item.next.hash === null)) {
							item.width += item.next.width;
							item.next = item.next.next;
						}
					} else if (currentFrame > item.frame + frameTimeout) {
						this._ctx.fillStyle = randomColor();
						this._ctx.fillRect(item.x, item.y, item.width, item.height);
						// Remove old item...
						delete(this._hashMap[item.hash]);
						item.hash = null;
					}
					item = item.next;
				}
			}
		}
	};

	this.alloc = function (opts) {
		var requestHeight = opts.height,
			requestWidth = opts.width + 3, // Add some extra pixels to allow color bleeding...

			strokeStyle = opts.strokeStyle || '',
			fillStyle = opts.fillStyle || '',
			font = opts.font || '',
			hash = strokeStyle + '_' + fillStyle + '_' + font + '_' + opts.text,

			list = this._list,
			lines,
			item = this._hashMap[hash],
			i, j, k, l;

		if (item) {
			item.frame = this._currentFrame;
			item.refresh = false;
			return item;
		}

		for (i = 0, j = list.length; i < j; i++) {
			if (requestHeight <= list[i].size) {
				lines = list[i].lines;
				for (k = 0, l = lines.length; k < l; k++) {
					item = lines[k];
					while (item) {
						if ((requestWidth <= item.width) && (item.hash === null)) {
							if (requestWidth !== item.width) {
								//console.log('request:', requestWidth, 'width:', item.width, 'rest:', item.width - requestWidth);
								item.next = {
									previous: item,
									next: item.next,
									x: item.x + requestWidth,
									y: item.y,
									width: item.width - requestWidth,
									hash: null,
									frame: 0,
									ctx: this._ctx
								};
							}

							item.frame = this._currentFrame;
							item.hash = hash;
							item.width = requestWidth;
							item.height = requestHeight;
							item.refresh = true;

							this._ctx.clearRect(item.x, item.y, requestWidth, requestHeight);

							this._hashMap[hash] = item;
							return item;
						}
						item = item.next;
					}
				}

				break;
			}
		}

		return false;
	};

	this.getCanvas = function () {
		return this._canvas;
	};
});
