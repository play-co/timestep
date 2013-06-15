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
 * @package ui.backend.dom.animate;
 *
 * For now, this package simply forwards to Canvas' implementation.
 */

import ui.backend.canvas.animate as canvasAnimate;

exports = function (view) {
	// For DOM nodes, return only one singleton animation class.
	if ('_node' in view) {
		return view.getAnimation();
	} else {
		return canvasAnimate(view);
	}
}
exports.linear = canvasAnimate.linear;
exports.easeIn = canvasAnimate.easeIn;
exports.easeInOut = canvasAnimate.easeInOut;
exports.easeOut = canvasAnimate.easeOut;
