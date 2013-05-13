/* @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */

"use import";

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
