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
 * @class ui.debug.ConsoleView;
 */

import ui.View as View;

exports = Class(View, function (supr) {
	
	var defaults = {
		font: '12px Consolas, Monaco',
		maxLines: 'auto',
		lineHeight: 16,
		backgroundColor: '#000000',
		color: '#ffffff'
	};

	this.init = function (opts) {
		this._opts = merge(opts, defaults);
		supr(this, 'init', [this._opts]);

		this._font = this._opts.font;
		this._lineHeight = this._opts.lineHeight;
		this._maxLines = this._opts.maxLines;
		this._history = this._opts.maxLines;
		
		this._count = 0;
		this._lines = [];
	};

	this.buildView = function () {
		//if width/height not provided, default to parent dimensions
		this.style.width = (this._opts.width) ? this._opts.width : this.getSuperview().style.width;
		this.style.height = (this._opts.height) ? this._opts.height : this.getSuperview().style.height;
	};
	
	this.render = function (ctx) {
		ctx.fillStyle = this._opts.backgroundColor;
		ctx.fillRect(0, 0, this.style.width, this.style.height);
		
		var maxLines = this._maxLines == 'auto' ? (this.style.height - 25) / this._lineHeight | 0 : this._maxLines;
		this._history = maxLines;
		
		ctx.font = this._font;
		ctx.fillStyle = this._opts.color;
		
		var n = this._lines.length;
		for (var i = 0; i < maxLines; ++i) {
			var line = this._lines[n - maxLines + i];
			if (line) { ctx.fillText(line, 25, 25 + i * this._lineHeight); }
		}
	};

	/*
	 * @param {*...} args Argument(s) to print to the view.
	 */
	this.log = function (/*args ...*/) {
		++this._count;
		this._lines.push(Array.prototype.join.call(arguments, ' '));
		if (this._count >= this._history) {
			this._lines.shift();
		}
		this.needsRepaint();
	};
});
