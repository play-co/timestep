/**
 * @class ui.ViewPool;
 * facilitates easy view re-use
 */

exports = Class(function() {

	/**
	 * ctor (function) constructor function for the class you want to pool,
		must inherit from View
	 * initCount (integer) pre-initialize this many views,
		for optimal performance, avoid view instantiation during gameplay
	 * initOpts (object) opts object used to pre-initialize your views
	 */
	this.init = function(opts) {
		// constructor (required)
		this.ctor = opts.ctor;

		this.views = [];

		// early initialization to avoid dropping frames
		var initCount = opts.initCount,
			initOpts = opts.initOpts;
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
	this.obtainView = function(opts) {
		var view;

		if (this._freshViewIndex < this.views.length) {
			// re-use an existing view if we can
			view = this.views[this._freshViewIndex];
			view.updateOpts(opts);
		} else {
			// create a new view
			view = new this.ctor(opts);
			view._poolIndex = this.views.length;
			this.views.push(view);
		}

		this._freshViewIndex++;
		view._obtainedFromPool = true;
		view.style.visible = true;
		return view;
	};



	/**
	 * view (instance of this.ctor) to be recycled
	 */
	this.releaseView = function(view) {
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
	this.releaseAllViews = function() {
		for (var i = 0; i < this.views.length; i++) {
			var view = this.views[i];
			view._obtainedFromPool = false;
			view.style.visible = false;
		}

		this._freshViewIndex = 0;
	};
});