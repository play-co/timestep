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
 * @class ui.ViewPool;
 * Facilitates easy view re-use.
 *
 * @doc http://doc.gameclosure.com/api/ui-viewpool.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/viewpool.md
 */

exports = Class(function () {

	/**
	 * ctor (function) constructor function for the class you want to pool,
		must inherit from View
	 * initCount (integer) pre-initialize this many views,
		for optimal performance, avoid view instantiation during gameplay
	 * initOpts (object) opts object used to pre-initialize your views
	 */
	this.init = function (opts) {
		// constructor (required)
		this.ctor = opts.ctor;

		this.views = [];

		this._initOpts = opts.initOpts || {};

		// early initialization to avoid dropping frames
		var initCount = opts.initCount,
			initOpts = this._initOpts;
		if (initCount) {
			for (var i = 0; i < initCount; i++) {
				// each view should have its own opts object
				var viewOpts = {};
				for (var o in initOpts) {
					viewOpts[o] = initOpts[o];
				}

				var view = new this.ctor(viewOpts);
				view.style.visible = false;
				view._poolIndex = this.views.length;
				this.views.push(view);
			}
		}

		this._freshViewIndex = 0;
	};



	/**
	 * opts (object) populated with view opts properties
	 * returns a view from the pool
	 */
	this.obtainView = function (opts) {
		var view;

		if (this._freshViewIndex < this.views.length) {
			// re-use an existing view if we can
			view = this.views[this._freshViewIndex];
		} else {
			var initOpts = this._initOpts,
					viewOpts = {};

			for (var o in initOpts) {
				viewOpts[o] = initOpts[o];
			}

			// create a new view
			view = new this.ctor(viewOpts);
			view._poolIndex = this.views.length;
			this.views.push(view);
		}
		view.updateOpts(opts);

		this._freshViewIndex++;
		view._obtainedFromPool = true;
		view.style.visible = true;
		return view;
	};



	/**
	 * view (instance of this.ctor) to be recycled
	 */
	this.releaseView = function (view) {
		// only allow a view to be released once per obtain
		if (view._obtainedFromPool) {
			var temp = this.views[this._freshViewIndex - 1];
			this.views[this._freshViewIndex - 1] = view;
			this.views[view._poolIndex] = temp;

			var tempIndex = temp._poolIndex;
			temp._poolIndex = view._poolIndex;
			view._poolIndex = tempIndex;

			view._obtainedFromPool = false;
			view.style.visible = false;
			this._freshViewIndex--;
		}
	};



	/**
	 * release all views
	 */
	this.releaseAllViews = function () {
		for (var i = 0; i < this.views.length; i++) {
			var view = this.views[i];
			view._obtainedFromPool = false;
			view.style.visible = false;
		}

		this._freshViewIndex = 0;
	};
});