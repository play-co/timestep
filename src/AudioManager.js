/**
 * @license
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

/**
 * @class Sound;
 * Implement the correct Audio support, depending on what platform we're running.
 *
 * @doc http://doc.gameclosure.com/api/sound.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/sound.md
 */

import device;
import event.Emitter as Emitter;

// Allow accessibility controls (like muting).
// TODO This should definitely be in another file.
GLOBAL.ACCESSIBILITY = new (Class(Emitter, function (supr) {
	this.muted = false;

	this.mute = function (flag) {
		this.muted = flag;
		this.publish('MuteChange');
	};
}));
if (GLOBAL.ONACCESSIBLE) {
	GLOBAL.ONACCESSIBLE();
}

// Determine which API to include.
if (device.isMobileBrowser && !device.simulatingMobileBrowser){
	import platforms.browser.MobileBrowserAPI;
	exports = platforms.browser.MobileBrowserAPI;
} else {
	exports = jsio('import ui.backend.sound.HTML5API');
}
