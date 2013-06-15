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
 * @package ui.backend.debug.FPSView;
 *
 * The view which renders the FPS when showFPS is set to true on the
 * Application options.
 *
 * TODO Move to debug package.
 */

import device;
import lib.Enum as Enum;

import math.geom.Rect as Rect;
import math.geom.intersect as intersect;

import event.input.dispatch as dispatch;

var viewModes = new Enum('FPS', 'DT');

function strokeRect(ctx, rect, color) {
	ctx.fillStyle = color;
	ctx.fillRect(rect.x, rect.y, 1, rect.height);
	ctx.fillRect(rect.x, rect.y, rect.width, 1);
	ctx.fillRect(rect.x + rect.width - 1, rect.y, 1, rect.height);
	ctx.fillRect(rect.x, rect.y + rect.height - 1, rect.width, 1);
};

function fillRect(ctx, rect, color) {
	ctx.fillStyle = color;
	ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
};

var Graph = Class(function () {
	this.init = function (opts) {
		var Canvas = device.get('Canvas');

		this._width = opts.width;
		this._height = opts.height;

		this._maxValue = opts.maxValue;
		this._backgroundColor = opts.backgroundColor;
		this._colors = opts.colors;
		this._axisColor = opts.axisColor;

		this._canvas = new Canvas({width: opts.width, height: opts.height});
		this._ctx = this._canvas.getContext('2d');
		this._ctx.fillStyle = opts.backgroundColor;
		this._ctx.fillRect(0, 0, opts.width, opts.height);

		this._offset = 0;
		this._index = 0;
	};

	this.addValues = function (values, timeAxis) {
		var ctx = this._ctx,
			width = this._width,
			height = this._height,
			value,
			maxValue = this._maxValue,
			x = (this._offset + this._index) % width,
			y = this._height,
			n,
			i, j;

		ctx.fillStyle = this._backgroundColor;
		ctx.fillRect(x, 0, 2, height);

		i = values.length;
		while (i) {
			value = values[--i];
			if (value > maxValue) {
				value = maxValue;
			}
			n = ~~(value / maxValue *  height);
			ctx.fillStyle = this._colors[i];
			ctx.fillRect(x, height - n, 2, n);
		}

		ctx.fillStyle = this._axisColor;
		if (timeAxis) {
			ctx.fillRect(x, 0, 1, height);
		}
		ctx.fillRect(x, 25, 2, 1);
		ctx.fillRect(x, 50, 2, 1);
		ctx.fillRect(x, 75, 2, 1);

		if (this._index < width) {
			this._index += 2;
		} else {
			this._offset += 2;
			if (this._offset >= width) {
				this._offset = 0;
			}
		}
	};

	this.render = function (ctx, x, y) {
		var offset = this._offset,
			width = this._width,
			height = this._height;

		if (offset === 0) {
			ctx.drawImage(this._canvas, 0, 0, width, height, x, y, width, height);
		} else {
			ctx.drawImage(this._canvas, offset, 0, width - offset, height, x, y, width - offset, height);
			ctx.drawImage(this._canvas, 0, 0, offset, height, width - offset + x, y, offset, height);
		}
	};
});

exports = Class(function () {
	this.init = function (opts) {
		this._application = opts.application;

		this._time = +(new Date()) + 1000;
		this._frames = 0;
		this._fps = 20;
		this._dt = 10;

		this._minimized = true;

		var width = 200,
			height = 100;

		this._rectTop = new Rect(1, 1, width, 16);
		this._rectMin = new Rect(0, 0, 24, 15);
		this._rectMax = new Rect(0, 0, width + 2, height + 17);
		this._rect = this._rectMin;

		this._rectFPS = new Rect(141, 1, 30, 15);
		this._rectDT = new Rect(171, 1, 30, 15);

		this._borderColor = 'rgb(100,100,150)';
		this._backgroundColor = '#17182E';
		this._textColor = '#FFFFFF';

		this._viewMode = viewModes.DT;

		this._graphs = {}
		this._graphs[viewModes.FPS] = new Graph({
			width: width,
			height: height,
			maxValue: 60,
			backgroundColor: this._backgroundColor,
			colors: ['rgba(170,170,252,0.3)', 'rgb(170,170,252)'],
			axisColor: '#FFFFFF'
		});
		this._graphs[viewModes.DT] = new Graph({
			width: width,
			height: height,
			maxValue: 66,
			backgroundColor: this._backgroundColor,
			colors: ['rgba(255,0,0,0.5)', 'rgb(254,255,170)'],
			axisColor: '#FFFFFF'
		});
	};

	this.tick = function (dt) {
		var time = +(new Date());
		if (time > this._time) {
			this._time = time + 1000;
			this._fps = this._frames;
			this._frames = 1;
		} else {
			this._frames++;
		}

		var events = this._application.getEvents();
		if (events.length) {
			this._handleEvents(events);
		}

		this._dt = this._dt * 0.8 + dt * 0.2;

		if (!this._minimized) {
			switch (this._viewMode) {
				case viewModes.DT:
					this._graphs[viewModes.DT].addValues([this._dt, dt], (this._frames === 1));
					break;

				case viewModes.FPS:
					this._graphs[viewModes.FPS].addValues([this._fps, 1000 / dt], (this._frames === 1));
					break;
			}
		}
	};

	this._handleEvents = function (events) {
		var types = dispatch.eventTypes;
		var i = events.length;

		while (i) {
			var event = events[--i];
			switch (event.type) {
				case types.START:
					if (intersect.ptAndRect(event.srcPt, this._rect)) {
						if (this._minimized) {
							this._minimized = false;
						} else {
							if (intersect.ptAndRect(event.srcPt, this._rectFPS)) {
								this._viewMode = viewModes.FPS;
							} else if (intersect.ptAndRect(event.srcPt, this._rectDT)) {
								this._viewMode = viewModes.DT;
							} else {
								this._minimized = true;
							}
						}
						this._rect = this._minimized ? this._rectMin : this._rectMax;
					}
					break;
			}
		}
	};

	this.render = function (ctx) {
		ctx.save();

		ctx.textBaseline = 'top';
		ctx.textAlign = 'center';
		ctx.font = '12px Verdana';

		if (this._minimized) {
			fillRect(ctx, this._rect, this._backgroundColor);
		} else {
			fillRect(ctx, this._rectTop, this._backgroundColor);
			this._graphs[this._viewMode].render(ctx, 1, 17);
			ctx.fillStyle = this._borderColor;
			ctx.fillRect(0, 16, this._rect.width, 1);

			var fpsMode = (this._viewMode === viewModes.FPS),
				dtMode = (this._viewMode === viewModes.DT);

			fillRect(ctx, this._rectFPS, fpsMode ? this._borderColor : this._backgroundColor);
			ctx.fillStyle = fpsMode ? this._textColor : this._borderColor;
			ctx.fillText('FPS', this._rectFPS.x + this._rectFPS.width / 2, 0);

			fillRect(ctx, this._rectDT, dtMode ? this._borderColor : this._backgroundColor);
			ctx.fillStyle = dtMode ? this._textColor : this._borderColor;
			ctx.fillText('DT', this._rectDT.x + this._rectDT.width / 2, 0);
		}

		strokeRect(ctx, this._rect, this._borderColor);

		ctx.fillStyle = this._textColor;
		ctx.fillText(this._fps, 12, 0);

		ctx.restore();
	};

	this.getFPS = function () {
		return this._fps;
	};
});
