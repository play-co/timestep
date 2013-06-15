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

var DEBUG = false;

if (DEBUG) {
	var _debug = {
		space: '',
		stepIn: function () { this.space += ' '; return true; },
		stepOut: function () { this.space = this.space.slice(0, this.space.length - 1); return true; },
		log: function () { logger.log.apply(logger, [this.space].concat(Array.prototype.slice.call(arguments, 0))); return true; }
	};
	logger.log("===== CREATING REFLOW MANAGER");
}

// max reflows for any view in a given tick
var MAX_REFLOW_THRESHOLD = 6;

var _pool = new (Class(function () {
	this._pool = [];

	this.recycle = function (item) {
		item.count = 0;
		item.view = null;
		this._pool.push(item);
	}

	this.get = function (view) {
		var item = this._pool.pop() || {};
		item.view = view;

		item.iter = 0;
		item.count = 0;
		return item;
	}
}));

/**
 * The ReflowManager is the controller for view layout.  It hooks into
 * the render cycle in two places:
 *  1. at the start of a render to reflow any views that we know
 *     need layout.  This is signalled by calling calls to needsReflow
 *     on a view between render cycles that result in a call to 
 *     `ReflowMgr.add`.
 *  2. during render, if the view hasn't ever been rendered, the 
 *     ReflowManager is notified to initiate the buildView call
 *     and handle any reflow logic before the view's first render.
 * The ReflowManager uses a queue-like structure to resolve the reflow 
 * constraints. Views notify the ReflowManager through the add(view) 
 * method, which then adds the view to the queue.  During a reflow cycle,
 * the ReflowManager tracks how many iterations through the queue each 
 * view actually gets reflowed.  If the number of reflows exceeds the
 * MAX_REFLOW_THRESHOLD, reflow stops for that view, preventing infinite
 * loops when reflow cycles occur.
 */

var ReflowManager = exports = Class(function () {
	this.init = function () {
		this._pending = {};
		this._iter = 0;
	}

	this.setInRender = function (isInRender) {
		this._isInRender = isInRender;
	}

	this.add = function (view) {
		var uid = view.uid;
		var item = this._pending[uid] || (this._pending[uid] = _pool.get(view));

		item.needsReflow = true;

		// increment count once per reflow iteration
		if (item.iter != this._iter) {
			item.count++;
			item.iter = this._iter;
		}

		DEBUG && _debug.log('adding view', uid, view.style.width + 'x' + view.style.height, view.getTag());

		if (this._isInRender && !this._isInReflow) {
			this.startReflow(this._lastCtx);
		}
	}

	this._reflow = function (ctx, item) {
		item.needsReflow = false;

		var view = item.view;
		var style = view.style;
		if (!style.__firstRender) {
			style.__firstRender = true;

			DEBUG && _debug.log('calling buildView for', view.uid, '(' + view.style.width + 'x' + view.style.height + ')') && _debug.stepIn();
			view.buildView(ctx);
			DEBUG && _debug.stepOut();
		}

		if (view.hasListeners('Resize')) {
			var w = style.width;
			var h = style.height;
			if (style.__cachedWidth != w || style.__cachedHeight != h) {
				style.__cachedWidth = w;
				style.__cachedHeight = h;
				view.publish('Resize');
			}
		}

		if (view.__layout) { view.__layout.reflow(); }
		view.reflow(false);
	}

	this.startReflow = function (ctx) {
		this._lastCtx = ctx;
		this._isInReflow = true;
		this._iter = 0;
		var count;

		DEBUG && _debug.stepIn();

		// as long as we reflowed some views, keep looping
		do {
			++this._iter; // what iteration are we on? only increment a view's count once per iteration

			count = 0;
			for (var uid in this._pending) {
				var item = this._pending[uid];
				if (item.count > MAX_REFLOW_THRESHOLD) {
					logger.warn('reflow loop detected for view', item.view.uid);
					break;
				}

				if (item.needsReflow) {
					DEBUG && _debug.log('starting reflow for view', item.view.uid, '(' + item.count + ' times)') && _debug.stepIn();
					this._reflow(ctx, item);
					DEBUG && _debug.stepOut();
					++count;
				}
			}

			DEBUG && count && _debug.log('iteration', this._iter, 'reflowed', count, 'views');
		} while (count);

		// recyle items
		for (var uid in this._pending) {
			_pool.recycle(this._pending[uid]);
		}

		this._pending = {};
		this._isInReflow = false;

		DEBUG && _debug.stepOut();
	}

});

var _instance = null;
exports.get = function () {
	return (_instance || (_instance = new ReflowManager()));
}
