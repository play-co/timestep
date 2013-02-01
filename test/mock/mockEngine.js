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

exports.setup = function() {
	jsio('import _api.client.init');
	GC.__init__({ui: false, overlay: false});

	jsio('import ui.Engine as Application');
	global.app = new Application();

	global.CACHE = {};
	global.DEBUG = true;
	global.DEV_MODE = true;

	var lastTime = +new Date();
	setInterval(
		function() {
			var time = +new Date();
			global.app._tick(time - lastTime);
			lastTime = time;
		},
		50
	);
};