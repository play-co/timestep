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


import util.setProperty as setProperty;

var BaseBacking = exports = Class(function () {

	// required methods:
	//
	// this._onResize = function () {};
	// this._onZIndex = function () {};

	var styleKeys = this.constructor.styleKeys = {};

	// keys map to properties
	var BASE_STYLE_PROPS = {
		'x': {value: 0},
		'y': {value: 0},
		'offsetX': {value: 0}, //translate
		'offsetY': {value: 0},
		'offsetXPercent': {value: undefined, cb: '_onOffsetX'}, //not implemented
		'offsetYPercent': {value: undefined, cb: '_onOffsetY'},
		'anchorX': {value: 0}, //rotation and scale
		'anchorY': {value: 0},
		'centerAnchor': {value: false},
		'width': {cb: '_onResize'},
		'height': {cb: '_onResize'},
		'r': {value: 0},
		'opacity': {value: 1},
		'zIndex': {value: 0, cb: '_onZIndex'},
		// 'radius': {
		// 	get: function () {
		// 		return this._cache && 'radius' in this._cache ? this._cache.radius : this.updateRadius();
		// 	}
		// },
		'scale': {value: 1},
		'scaleX': {value: 1},
		'scaleY': {value: 1},
		'flipX': {value: false},
		'flipY': {value: false},
		'visible': {value: true},
		'shadowColor': {value: 'black'}, //only has an effect in TextView??
		'clip': {value: false},
		'backgroundColor': {value: ''},
		'compositeOperation': {value: undefined},
		'color': {value: ''}
	};

	this.constructor.addProperty = function (key, def) {
		styleKeys[key] = true;
		setProperty(this.prototype, key, def);
	}

	for (var key in BASE_STYLE_PROPS) {
		this.constructor.addProperty(key, BASE_STYLE_PROPS[key]);
	}

	this.localizePoint = function (pt) {
		pt.x -= this.x + this.anchorX + this.offsetX;
		pt.y -= this.y + this.anchorY + this.offsetY;
		if (this.r) { pt.rotate(-this.r); }
		pt.scale(1 / this.scale);
		pt.x += this.anchorX;
		pt.y += this.anchorY;
		return pt;
	}

	this.copy = function () {
		var copy = {};
		for (var key in styleKeys) {
			copy[key] = this[key];
		}

		return copy;
	}
	
	this.update = function (style) {
		for (var i in style) {
			if (style.hasOwnProperty(i) && styleKeys.hasOwnProperty(i)) {
				this[i] = style[i];
			}
		}
		return this;
	}
});
