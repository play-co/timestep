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

var jsdom = require('jsdom').jsdom;

var mockCanvas = require('./mockCanvas');
var mockImage = require('./mockImage');
var mockAudio = require('./mockAudio');

var done = false;

exports.setup = function() {
	if (done) {
		return;
	}

	global.Image = mockImage.Image;
	global.Audio = mockAudio.Audio;
	global.document = jsdom("<html><head></head><body></body></html>");

	var createElement = document.createElement;
	document.createElement = function(element) {
		if (element === 'canvas') {
			return new mockCanvas.Canvas();
		}
		return createElement.apply(document, arguments);
	};

	global.window = document.createWindow();
	global.navigator = window.navigator;

	navigator.userAgent = 'TeaLeaf';

	done = true;
};