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
 * @module ui.filter;
 *
 * A namespace for graphical filters used in games. These are attached using
 * View functions and applied using the Image class. This class is purely informational.
 *
 * If this is a namespace, the file name should be lower-case!
 *
 * Resources:
 *  http://jswidget.com/blog/2011/03/11/image-blending-algorithmpart-i/
 *  http://jswidget.com/blog/2011/03/11/image-blending-algorithmpart-ii/
 *
 * @doc http://doc.gameclosure.com/api/ui-filter.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/filter.md
 */

import ui.resource.Image as Image;

var Filter = exports.Filter = Class(function () {

	var defaults = {
		priority: 0,
		type: null,
		r: 0,
		g: 0,
		b: 0,
		a: 0
	};

	this.init = function (opts) {
		this._opts = merge(opts, defaults);
		this._views = [];
	};

	this.get = function () {
		return this._opts;
	};

	this.getType = function () {
		return this._opts.type;
	};

	this.update = function (opts) {
		opts = opts || {};
		for (var prop in opts) {
			if (typeof this._opts[prop] != 'undefined') {
				this._opts[prop] = opts[prop];
			}
		}
		for (var i = 0; i < this._views.length; i++) {
			var view = this._views[i];
			view.__view.filterColor = this.getColorString();
			view.__view.filterType = Filter.TYPES[this.getType()] || 0;
		}
	};

	this.setView = function (view) {
		if (this._views.indexOf(view) == -1) {
			this._views.push(view);
		}
	};

	this.removeView = function (view) {
		var i = this._views.indexOf(view);
		if (i != -1) {
			this._views.splice(i, 1);
		}
	};

	this.getColorString = function () {
		var c = this._opts;
		return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + c.a + ')';
	};
});

Filter.TYPES = {
	"None": 0,
	"LinearAdd": 1, 
	"Multiply": 2
};

/**
 * Linear add (lighten) filter.
 */

exports.LinearAddFilter = Class(Filter, function (supr) {
	this.init = function (opts) {
		supr(this,'init',arguments);
		this._opts.type = 'LinearAdd';
	};

	this.get = function () {
		return this._opts;
	};
});

/**
 * Tint (averaging) filter.
 */

exports.TintFilter = Class(Filter, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);
		this._opts.type = 'Tint';
	};

	this.get = function () {
		return this._opts;
	};
});

/**
 * Multiply filter.
 */

exports.MultiplyFilter = Class(Filter, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);
		this._opts.type = 'Multiply';
	};

	this.get = function () {
		return this._opts;
	};
});

/**
 * Positive masking.
 */

exports.PositiveMaskFilter = Class(Filter, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);
		this._opts.type = 'PositiveMask';
		if (this._opts.image) {
			this._opts.imgObject = new Image({url: this._opts.image});
		}
	};

	this.get = function () {
		return this._opts;
	};
});

/**
 * Negative masking.
 */

exports.NegativeMaskFilter = Class(Filter, function (supr) {
	this.init = function (opts) {
		supr(this, 'init', arguments);
		this._opts.type = 'NegativeMask';
		if (this._opts.image) {
			this._opts.imgObject = new Image({url: this._opts.image});
		}
	};

	this.get = function () {
		return this._opts;
	}
});
