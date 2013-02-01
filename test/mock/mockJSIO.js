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

var fs = require("fs");

var done = false;

function scanAddons() {
	var path = require('path');
	var libPath = path.join(__dirname, "../../../../addons");

	files = fs.readdirSync(libPath);

	var paths = [];
	for (var i = 0; i < files.length; i++) {
		var load;
		try {
			load = require(libPath + "/" + files[i] + "/index").load;
		} catch (e) {
			load = false;
		}
		if (load) {
			try {
				paths = paths.concat(load().paths);
			} catch (err) {
				null;
			}
		}
	}
	return paths;
};

exports.setup = function() {
	if (done) {
		return;
	}

	var path = require('path');
	var libPath = path.join(__dirname, '../../../');

	global.jsio = require(path.join(libPath, 'js.io'));
	jsio.__env.name = 'browser';

	jsio.path.add(libPath);
	jsio.path.add(path.join(libPath, './js-api'));
	jsio.path.add(path.join(libPath, './js-api/api'));
	jsio.path.add(path.join(libPath, './timestep/src'));

	var paths = scanAddons();
	var i = paths.length;
	while (i) {
		console.log("Addon path:", paths[--i])
		jsio.path.add(paths[i]);
	}

	done = true;
};
