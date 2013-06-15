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
 * @class ui.widget.Spinner;
 */
import ui.View as View;

exports = Class(View, function (supr) {

	var defaults = {
		cycles: 0.5,
		radius: 10,
		spokes: 20,
		thickness: 2,
		trail: 10,
		color: '#ffffff',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		layout: 'box'
	};
	
	this.tag = 'Spinner';
	this._t = 0;
	
	this.init = function (opts) {
		this._opts = merge(opts, defaults);
		
		this._step = 2 * Math.PI / this._opts.spokes;
		
		supr(this, 'init', [this._opts]);
	};
	
	this.tick = function (dt) {
		this._t += dt;
		
		var r = (this._t / 1000 % (1 / this._opts.cycles)) * Math.PI;
		
		var oldR = this._r;
		this._r = r - (r % this._step);
		
		if (oldR != r) {
			this.needsRepaint();
		}
	}
	
	this.render = function (ctx) {
		ctx.fillStyle = this._opts.backgroundColor;
		
		var w = this.style.width,
				h = this.style.height,
				radius = this._opts.radius,
				trail = this._opts.trail,
				thickness = this._opts.thickness,
				x, y, i, j;
		
		for (y = 0; y < radius; ++y) {
			j = y + 1;
			x = Math.round(radius - Math.sqrt(2 * j * radius - j * j));
			ctx.fillRect(x, y, w - 2 * x, 1);
		}
		
		y = h - radius;
		ctx.fillRect(0, radius, w, y - radius);
		
		for (i = 0; i < radius; ++i) {
			j = radius - i;
			x = Math.round(radius - Math.sqrt(2 * j * radius - j * j));
			ctx.fillRect(x, y + i, w - 2 * x, 1);
		}
		
		ctx.fillStyle = this._opts.color;
		ctx.translate(w / 2, h / 2);
		w /= 2;
		ctx.rotate(this._r);
		
		for (i = 0; i < this._opts.spokes; ++i) {
			ctx.rotate(this._step);
			ctx.globalAlpha = Math.max(0.1, (i - trail) / trail);
			ctx.fillRect(10, -thickness / 2, w - 15, thickness);
		}
	}
});
