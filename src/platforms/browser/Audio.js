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
 * @package timestep.env.browser.Audio;
 *
 * Audio implementation using the <audio> element for browsers.
 */

exports = function (opts) {
	var defaults = {
		autoplay: false,
		preload: 'auto',
		volume: 1.0,
		loop: 0,
		src: ''
	};
	
	opts = merge(opts, defaults);
	var el = document.createElement('Audio');
	
	el.autoplay = opts.autoplay;
	el.preload = opts.preload;
	el.volume = opts.volume;
	el.loop = opts.loop;
	el.src = opts.src;
	
	return el;
};