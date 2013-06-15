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
 * @package ui.layout.Padding;
 *
 * A simple class to express padding views.
 */

exports = Padding = Class(function () {
	this.init =
	this.update = function (args) {
		if (args instanceof Padding) {
			this.top = args.top;
			this.right = args.right;
			this.bottom = args.bottom;
			this.left = args.left;
			return;
		}
		if (typeof args == 'string') {
			args = args.split(/\s+/).map(function (piece) { return parseFloat(piece); });
		}

		if (!args || !args.length) { args = [args || 0]; }

		switch (args.length) {
			case 1:
				this.left = this.right = this.top = this.bottom = args[0];
				break;
			case 2:
				this.top = this.bottom = args[0];
				this.left = this.right = args[1];
				break;
			case 3:
				this.top = args[0];
				this.left = this.right = args[1];
				this.bottom = args[2];
				break;
			case 4:
				this.top = args[0];
				this.right = args[1];
				this.bottom = args[2];
				this.left = args[3];
				break;
		}
	}

	this.getVertical = function () { return this.top + this.bottom; }
	this.getHorizontal = function () { return this.left + this.right; }

	this.toString = function () { return [this.top, this.right, this.bottom, this.left].join(' '); }
});