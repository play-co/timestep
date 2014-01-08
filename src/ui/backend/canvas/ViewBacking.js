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
 * @package ui.backend.canvas.ViewStyle;
 *
 * Models the style object of the canvas View.
 */

import ..strPad;
import ..BaseBacking;
import util.setProperty as setProperty;

var _styleKeys = {};

var ViewBacking = exports = Class(BaseBacking, function () {

	this.constructor.absScale = 1;

	this.init = function (view) {
		this._view = view;
		this._subviews = [];
	}

	this.getSuperview = function () { return this._superview; }
	this.getSubviews = function () {
		if (this._needsSort) { this._needsSort = false; this._subviews.sort(); }
		var subviews = [];
		var backings = this._subviews;
		var n = backings.length;
		for (var i = 0; i < n; ++i) {
			subviews[i] = backings[i]._view;
		}

		return subviews;
	}

	var ADD_COUNTER = 900000;
	this.addSubview = function (view) {
		var backing = view.__view;
		var superview = backing._superview;
		if (superview == this._view || this == backing) { return false; }
		if (superview) { superview.__view.removeSubview(view); }

		var n = this._subviews.length;
		this._subviews[n] = backing;

		backing._superview = this._view;
		backing._setAddedAt(++ADD_COUNTER);

		if (n && backing.__sortKey < this._subviews[n - 1].__sortKey) {
			this._needsSort = true;
		}

		return true;
	}

	this.removeSubview = function (targetView) {
		var index = this._subviews.indexOf(targetView.__view);
		if (index != -1) {
			this._subviews.splice(index, 1);
			// this._view.needsRepaint();

			targetView.__view._superview = null;
			return true;
		}

		return false;
	}

	this.wrapTick = function (dt, app) {
		this._view.tick && this._view.tick(dt, app);

		for (var i = 0, view; view = this._subviews[i]; ++i) {
			view.wrapTick(dt, app);
		}

		// TODO: support partial repaints?
		// if (this._view._needsRepaint) {
		// 	this._view._needsRepaint = false;
		// 	app.needsRepaint();
		// }
	}

	this.wrapRender = function (ctx, opts) {
		if (!this.visible) { return; }

		if (!this.__firstRender) { this._view.needsReflow(true); }
		if (this._needsSort) { this._needsSort = false; this._subviews.sort(); }

		var width = this._width;
		var height = this._height;
		if (width < 0 || height < 0) { return; }

		ctx.save();

		ctx.translate(this.x + this.anchorX + this.offsetX, this.y + this.anchorY + this.offsetY);

		if (this.r) { ctx.rotate(this.r); }

		// clip this render to be within its view;
		if (this.scale != 1) {
			ctx.scale(this.scale, this.scale);
			ViewBacking.absScale *= this.scale;
		}

		// scale dimensions individually
		if (this.scaleX != 1) {
			ctx.scale(this.scaleX, 1);
		}
		if (this.scaleY != 1) {
			ctx.scale(1, this.scaleY);
		}

		this.absScale = ViewBacking.absScale;

		if (this.opacity != 1) { ctx.globalAlpha *= this.opacity; }

		ctx.translate(-this.anchorX, -this.anchorY);

		if (this.clip) { ctx.clipRect(0, 0, width, height); }

		var filters = {};
		var filter = this._view.getFilter();
		if (filter) {
			filters[filter._opts.type] = filter;
		}
		ctx.setFilters(filters);

		if (this.flipX || this.flipY) {
			ctx.translate(
				this.flipX ? width / 2 : 0,
				this.flipY ? height / 2 : 0
			);

			ctx.scale(
				this.flipX ? -1 : 1,
				this.flipY ? -1 : 1
			);

			ctx.translate(
				this.flipX ? -width / 2 : 0,
				this.flipY ? -height / 2 : 0
			);
		}

		try {
			if (this.backgroundColor) {
				ctx.fillStyle = this.backgroundColor;
				ctx.fillRect(0, 0, width, height);
			}

			var viewport = opts.viewport;
			this._view.render && this._view.render(ctx, opts);
			this._renderSubviews(ctx, opts);
			opts.viewport = viewport;

		} finally {
			ctx.clearFilters();
			ctx.restore();
			ViewBacking.absScale /= this.scale;
		}
	}

	this._renderSubviews = function (ctx, opts) {
		var i = 0;
		var view;
		var subviews = this._subviews;
		while (view = subviews[i++]) {
			view.wrapRender(ctx, opts);
		}
	}

	// this._clearCache = function () { this._cache = null; }

	// this.updateRadius = function () {
	// 	var w = this.width * 0.5,
	// 		h = this.height * 0.5;

	// 	if (!this._cache) { this._cache = {}; }
	// 	return (this._cache.radius = Math.sqrt(w * w + h * h));
	// }

	this._onResize = function (prop, value, prevValue) {
		// local properties are invalidated
		// this._cache = null;

		// child view properties might be invalidated
		this._view.needsReflow();
	}

	this._sortIndex = strPad.initialValue;
	this._onZIndex = function (_, zIndex) {
		this._sortIndex = strPad.pad(zIndex);

		this._setSortKey();
		this._view.needsRepaint();

		var superview = this._view.getSuperview();
		if (superview) { superview.__view._needsSort = true; }
	}

	this._setAddedAt = function (addedAt) {
		this._addedAt = addedAt;
		this._setSortKey();
	}

	this._setSortKey = function () {
		this.__sortKey = this._sortIndex + this._addedAt;
	}

	//not implemented
	this._onOffsetX = function (n) {
		this.offsetX = n * this.width / 100;
	};

	//not implemented
	this._onOffsetY = function (n) {
		this.offsetY = n * this.height / 100;
	};

	this.toString = function () { return this.__sortKey; }
});
