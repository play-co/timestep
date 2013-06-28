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

import std.js as JS;

exports = Class(function () {
	
	this.init = function (target, opts) {
		this._target = target;
		this._opts = opts = JS.merge(opts, {
			trackClicks: false,
			outline: false,
			flash: false
		});
		
		this.outline = opts.outline;
		this.trackClicks = opts.trackClicks;
		this.flash = opts.flash;
		
		this._flashState = 0;
		this._nextFlash = 0;
	}
	
	this.preRender = function (ctx) {
		if (!this._time) { this._time = +new Date(); }
		var prevTime = this._time;
		this._time = +new Date();
		this._dt = this._time - prevTime;
		
		var s = this._target.style;
		if (this.outline) {
			ctx.save();
			ctx.globalAlpha = 0.2;
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 1.0;
			ctx.strokeRect(0, 0, s.width, s.height);
			ctx.restore();
		}
	}
	
	this.postRender = function (ctx) {
			var s = this._target.style;

		var t = this._target;
		if (this.trackClicks) {
			for (var i = t._clicks.length - 1; i >= 0; --i) {
				var c = t._clicks[i];
				ctx.setFillStyle('rgba(0, 0, 0, ' + c.o + ')');
				c.o -= 0.4 * this._dt / 1000;
				if (c.o > 0) {
					ctx.circle(c.x, c.y, 15);
					ctx.fill();
				} else {
					t._clicks.splice(i, 1);
				}
			}
		}
		
		if (this.flash) {
			switch(this._flashState) {
				case 0:
					ctx.setFillStyle('rgba(0, 0, 0, 0.5)');
					break;
				case 1:
					ctx.setFillStyle('rgba(0, 0, 0, 0)');
					break;
				case 2:
					ctx.setFillStyle('rgba(255, 255, 255, 0.5)');
					break;
				case 3:
					ctx.setFillStyle('rgba(0, 0, 0, 0)');
					break;
			}
			
			var now = +new Date();
			if (now > this._nextFlash) {
				this._flashState = (this._flashState + 1) % 4;
				this._nextFlash = now + 300;
			}
			
			ctx.fillRect(0, 0, t.style.width, t.style.height);
		}
	}
});
