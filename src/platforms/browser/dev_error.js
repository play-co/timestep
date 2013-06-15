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
 * @package timestep.env.browser.dev_error;
 *
 * Displays a developer error.
 *
 * ??? TODO move to a debug package.
 */

exports.render = function (e) {
	logger.error("unhandled tick exception");
	logger.error(e.stack);
	
	var c = document.getElementsByTagName('canvas');
	for (var i = 0, el; el = c[i]; ++i) {
		render(el.getContext('2d'), e);
	}
}

function render(ctx, e) {
	ctx.fillStyle = "rgb(0, 0, 255)";
	ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	var x = 30, y = 40;

	ctx.fillStyle = "#FFF";
	ctx.font = "bold 12px Monaco,\"Bitstream Vera Sans Mono\",\"Lucida Console\",Terminal,monospace";
	function drawLine(msg) {
		ctx.fillText(msg, x, y);
		y += 20;
	}
	
	drawLine(e.message);
	y += 40;
	e.stack.split('\n').map(drawLine);
}
