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
 * @package timestep.env.browser.Canvas;
 *
 * Canvas implementation for browsers. Wraps a Context2D.
 */

import .Context2D;

exports = Class(function () {
	this.init = function (opts) {
		opts = merge(opts, {width: 300, height: 200});
		var ctx = new Context2D(opts);
		var el = this._el = ctx.getElement();
		el.getContext = function () { return ctx; }
		el.complete = true;
		return el;
	}
});
