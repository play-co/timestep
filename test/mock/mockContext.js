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

var mockContext = require('./mockContext');

exports.Context = function(canvas) {
	this.canvas = canvas;

	this.save = function() {};
	this.restore = function() {};
	this.translate = function() {};
	this.beginPath = function() {};
	this.moveTo = function() {};
	this.lineTo = function() {};
	this.closePath = function() {};
	this.fill = function() {};
	this.stroke = function() {};
	this.fillRect = function() {};
	this.strokeRect = function() {};
	this.fillText = function() {};
	this.strokeText = function() {};
	this.clearRect = function() {};
	this.clipRect = function() {};
	this.clip = function() {};
	this.rect = function() {};
};
