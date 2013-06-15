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
 * @class ui.ViewPool;
 * facilitates easy view re-use
 */
exports = Class(function () {
	/**
	 * ctor (function) constructor function for the class you want to pool,
	 * must inherit from View
	 *
	 * initCount (integer) pre-initialize this many views,
	 * for optimal performance, avoid view instantiation during gameplay
	 *
	 * initOpts (object) opts object used to pre-initialize your views
	 */
	this.init = function (opts) {
		this._views = [];
		this._opts = opts;

		// early initialization to avoid dropping frames
		var i = opts.initCount || 0;
		while (i) {
			this._createNewView({});
			i--;
		}

		this._freshViewIndex = 0;
	};

	this._createNewView = function () {
		var viewOpts = {};
		var initOpts = this._opts.initOpts;

		// Each view should have its own opts object
		for (var o in initOpts) {
			viewOpts[o] = initOpts[o];
		}

		var view = new this._opts.ctor(viewOpts);
		view.style.visible = false;
		view._poolIndex = this._views.length;
		this._views.push(view);

		return view;
	};

	/**
	 * Returns a view from the pool
	 */
	this.obtainView = function () {
		var view;

		if (this._freshViewIndex < this._views.length) {
			// re-use an existing view if we can
			view = this._views[this._freshViewIndex];
		} else {
			console.log('MAKING NEW VIEW FOR: ' + (this._opts.tag || this._opts.ctor));
			view = this._createNewView();
		}

		view.onObtain && view.onObtain();

		this._freshViewIndex++;
		view._obtainedFromPool = true;

		return view;
	};

	/**
	 * View (instance of this._ctor) to be recycled
	 */
	this.releaseView = function (view) {
		// Only allow a view to be released once per obtain
		if (view._obtainedFromPool) {
			view.onRelease && view.onRelease();
			view.stopAnimation && view.stopAnimation();

			var temp = this._views[this._freshViewIndex - 1];
			this._views[this._freshViewIndex - 1] = view;
			this._views[view._poolIndex] = temp;

			var tempIndex = temp._poolIndex;
			temp._poolIndex = view._poolIndex;
			view._poolIndex = tempIndex;

			view._obtainedFromPool = false;
			view.style.visible = false;
			this._freshViewIndex--;

			return true;
		}

		return false;
	};

	/**
	 * Release all views
	 */
	this.releaseAllViews = function () {
		var views = this._views;
		var i = views.length;

		while (i) {
			var view = views[--i];
			view._obtainedFromPool = false;
			view.style.visible = false;
		}

		this._freshViewIndex = 0;
	};
});