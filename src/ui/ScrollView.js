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
 * @class ui.ScrollView;
 *
 * @doc http://doc.gameclosure.com/api/ui-scrollview.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/scrollview.md
 */
import animate;
import device;

import event.input.dispatch as input;
import event.input.InputEvent as InputEvent;

import math.geom.Rect as Rect;
import math.geom.Point as Point;
import math.geom.Circle as Circle;
import math.geom.intersect as intersect;

import ui.View as View;
import ui.backend.ReflowManager as ReflowManager;

var _reflowMgr = ReflowManager.get();

var DEBUG = true;
var USE_CLIPPING = false;
// var USE_CLIPPING = !device.useDOM && !device.isMobile;

if (DEBUG) {
	var _debug = {
		bounds: []
	};
}
/*function customEaseOut(x) {
	var x = (1 - x);
	x *= x;
	return 1 - x * x;
}*/

/**
 * @extends ui.View
 */
exports = Class(View, function (supr) {

	this.tag = "ScrollView";

	if (USE_CLIPPING) {

		// extend the default backing ctor
		this.BackingCtor = Class(View.prototype.BackingCtor, function () {

			function clippedWrapRender(contentView, backing, ctx, opts) {
				if (!backing.visible) { return; }

				if (!backing.__firstRender) { _reflowMgr.add(backing._view); }

				// non-native case only
				if (backing._needsSort) { backing._needsSort = false; backing._subviews.sort(); }

				ctx.save();
				ctx.translate(backing.x + backing.anchorX, backing.y + backing.anchorY);

				if (backing.r) { ctx.rotate(backing.r); }

				// clip this render to be within its view;
				if (backing.scale != 1) { ctx.scale(backing.scale, backing.scale); }
				if (backing.opacity != 1) { ctx.globalAlpha *= backing.opacity; }

				ctx.translate(-backing.anchorX, -backing.anchorY);

				// if (backing._circle) { ctx.translate(-backing.width / 2, -backing.height / 2); }

				if (backing.clip) { ctx.clipRect(0, 0, backing.width, backing.height); }
				// var filters = this.getFilters();
				// ctx.setFilters(filters);

				try {
					if (backing.backgroundColor) {
						ctx.fillStyle = backing.backgroundColor;
						ctx.fillRect(0, 0, backing.width, backing.height);
					}

					backing._view.render && backing._view.render(ctx, opts);

					var viewport = opts.viewport;
					var subviews = backing._subviews;

					var i = 0, subview;
					while (subview = subviews[i++]) {
						if (subview == contentView) {
							clippedWrapRender(contentView, subview.__view, ctx, opts);

							// restore the old viewport it was changed
							opts.viewport = viewport;
						} else {
							var pos = subview.getPosition(viewport.src);
							getBoundingRectangle(pos);

							if (intersect.isRectAndRect(pos, viewport)) {
								clippedWrapRender(contentView, subview.__view, ctx, opts);
							}

							if (DEBUG) {
								_debug.bounds.push(pos);
							}
						}
					}
				} catch(e) {
				 	logger.error(backing._view, e.message, e.stack);
				} finally {
					// ctx.clearFilters();
					ctx.restore();
				}
			}

			this.wrapRender = function (ctx, opts) {

				clippedWrapRender(this._view._contentView, this, ctx, opts);

				if (DEBUG) {
					var viewport = opts.viewport;

					ctx.save();
					ctx.translate(this.x + this.anchorX, this.y + this.anchorY);
					if (this.r) { ctx.rotate(this.r); }
					if (this.scale != 1) { ctx.scale(this.scale, this.scale); }
					ctx.translate(-this.anchorX, -this.anchorY);

					ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
					ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);

					ctx.translate(-viewport.x, -viewport.y);

					ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
					for (var i = 0, bounds; (bounds = _debug.bounds[i]); ++i) {
						ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
					}
					_debug.bounds = [];
					ctx.restore();
				}
			}
		});
	};

	var defaults = {
		offsetX: 0,
		offsetY: 0,
		scrollY: true,
		scrollX: true,
		clip: true,
		bounce: true,
		drag: true,
		inertia: true,
		dragRadius: 10,
		snapPixels: undefined,
		useLayoutBounds: false,
		layout: 'box'
	};

	this.init = function (opts) {

		opts = merge(opts, defaults);

		this._acceleration = 15;

		this._animState = {
			offset: 0,
			lastDelta: 0,
			offset: 0
		};

		this._snapPixels = 1;

		this._scrollBounds = merge(opts.scrollBounds, {
			minX: -Number.MAX_VALUE,
			minY: -Number.MAX_VALUE,
			maxX: Number.MAX_VALUE,
			maxY: Number.MAX_VALUE
		});

		this._contentView = new View({
			x: opts.offsetX,
			y: opts.offsetY,
			infinite: true,
			tag: "ContentView",
			layout: 'box',
			layoutWidth: '100%',
			layoutHeight: '100%'
		});

		this._viewport = new Rect();
		this._viewport.src = this._contentView;

		supr(this, 'init', [opts]);
		supr(this, 'addSubview', [this._contentView]);

		// this.__layout = this._contentView.__layout;
	}

	this.updateOpts = function (opts) {
		supr(this, 'updateOpts', arguments);

		if ('useLayoutBounds' in opts) {
			if (opts.useLayoutBounds) {
				this.subscribe('LayoutResize', this, '_updateLayoutBounds');
				this._updateLayoutBounds();
			} else {
				this.unsubscribe('LayoutResize', this, '_updateLayoutBounds');
			}
		}

		return opts;
	};

	this._updateLayoutBounds = function () {
		if (!this.style.layout || !this._opts.useLayoutBounds) { return; }

		var bounds = this._scrollBounds;
		bounds.minX = bounds.minY = bounds.maxX = bounds.maxY = 0;
		this._contentView.getSubviews().forEach(function(sv) {
			bounds.minX = Math.min(bounds.minX, sv.style.x);
			bounds.minY = Math.min(bounds.minY, sv.style.y);
			bounds.maxX = Math.max(bounds.maxX, sv.style.x + sv.style.width);
			bounds.maxY = Math.max(bounds.maxY, sv.style.y + sv.style.height);
		});
	};

	this.buildView = function () {
		this._snapPixels = this._opts.snapPixels || 1 / this.getPosition().scale;
	};

	this.addSubview = function (view) {
		this._contentView.addSubview(view);
		this._updateLayoutBounds();
	};
	this.removeSubview = function (view) {
		this._contentView.removeSubview(view);
		this._updateLayoutBounds();
	};

	this.addFixedView = function (view) { return supr(this, 'addSubview', [view]); };
	this.removeFixedView = function (view) { return supr(this, 'removeSubview', [view]); };

	var BOUNCE_MAX_DIST = 50;
	var PI_2 = Math.PI / 2;

	this.getStyleBounds = function () {
		var bounds = bounds = this._scrollBounds;
		var minY = -bounds.maxY;
		var maxY = -bounds.minY < minY ? minY : -bounds.minY;
		var minX = -bounds.maxX;
		var maxX = -bounds.minX < minX ? minX : -bounds.minX;
		return {
			minY: Math.min(minY + this.style.height, maxY),
			maxY: maxY,
			minX: Math.min(minX + this.style.width, maxX),
			maxX: maxX
		};
	};

	this.getOffset = function () { return new Point(this._contentView.style); };
	this.getOffsetX = function () { return this._contentView.style.x; };
	this.getOffsetY = function () { return this._contentView.style.y; };

	this.setOffset = function (x, y) {
		var style = this._contentView.style,
			delta = {
				x: 0,
				y: 0
			};

		var bounds = this.getStyleBounds();

		if (typeof x == 'number') {
			if (this._isBouncing) {
				// do nothing
			} else if (this._canBounce) {
				if (x < bounds.minX) {
					var delta = (bounds.minX - x) / BOUNCE_MAX_DIST;
					x = bounds.minX - Math.atan(delta) * BOUNCE_MAX_DIST / PI_2;
				}

				if (x > bounds.maxX) {
					var delta = (x - bounds.maxX) / BOUNCE_MAX_DIST;
					x = bounds.maxX + Math.atan(delta) * BOUNCE_MAX_DIST / PI_2;
				}
			} else {
				if (x < bounds.minX) { x = bounds.minX; }
				if (x > bounds.maxX) { x = bounds.maxX; }
			}

			if (x != style.x) {
				delta.x = x - style.x;
				style.x = (x / this._snapPixels | 0) * this._snapPixels;
			}
		}

		if (typeof y == 'number') {
			if (this._isBouncing) {
				// do nothing
			} else if (this._canBounce) {
				if (y < bounds.minY) {
					var delta = (bounds.minY - y) / BOUNCE_MAX_DIST;
					y = bounds.minY - Math.atan(delta) * BOUNCE_MAX_DIST / PI_2;
				}

				if (y > bounds.maxY) {
					var delta = (y - bounds.maxY) / BOUNCE_MAX_DIST;
					y = bounds.maxY + Math.atan(delta) * BOUNCE_MAX_DIST / PI_2;
				}
			} else {
				if (y < bounds.minY) { y = bounds.minY; }
				if (y > bounds.maxY) { y = bounds.maxY; }
			}

			if (y != style.y) {
				delta.y = y - style.y;
				style.y = (y / this._snapPixels | 0) * this._snapPixels;
			}
		}

		this.publish('Scrolled', delta);
	};

	this.isScrolling = function () { return this.isDragging() || this._anim && this._anim.hasFrames(); };

	this.stopScrolling = function () {
		this._anim && this._anim.now({}, 1);
	};

	this.onInputStart = function (evt, pt) {
		if (this._opts.drag) {
			this.startDrag({radius: this._opts.dragRadius * this._snapPixels});

			if (this._anim && this._anim.hasFrames()) {
				this._anim.clear();
			}

			evt.cancel();
		}
	};

	this.onDragStart = function (dragEvt) {
		input.clearOverState(dragEvt.id);

		this._contentView.getInput().blockEvents = true;
		this._startBounce();
		this._animState.offset = this.getOffset();
		this._anim = animate(this._animState).clear();
	};

	this.onDrag = function (dragEvt, moveEvt, delta) {
		var state = this._animState;
		state.dt = delta.t;
		state.lastDelta = delta;

		if (!this._opts.scrollY) { delta.y = 0; }
		if (!this._opts.scrollX) { delta.x = 0; }

		this.setOffset(state.offset.x += delta.x, state.offset.y += delta.y);
		moveEvt.cancel();
	};

	this.onDragStop = function (dragEvt, selectEvt) {
		this._contentView.getInput().blockEvents = false;

		if (this._opts.inertia) {
			var delta = new Point(this._animState.lastDelta).scale(this._acceleration);
			var offset = this._animState.offset;
			var distance = delta.getMagnitude();

			// if we overshot the bounds, don't waste time animating the acceleration.
			var bounds = this.getStyleBounds();
			var target = new Point(offset).add(delta);
			if (target.y < bounds.minY - BOUNCE_MAX_DIST) {
				if (offset.y < bounds.minY) {
					distance = 0;
				} else {
					delta.y += (bounds.minY - BOUNCE_MAX_DIST - target.y);
					distance = delta.getMagnitude();
				}
			}

			if (target.y > bounds.maxY + BOUNCE_MAX_DIST) {
				if (offset.y > bounds.maxY) {
					distance = 0;
				} else {
					delta.y -= (target.y - (bounds.maxY - BOUNCE_MAX_DIST));
					distance = delta.getMagnitude();
				}
			}

			if (distance) {
				this._anim.now(bind(this, function (tt, t) {
					this.setOffset(
						offset.x + delta.x * tt,
						offset.y + delta.y * tt);
				}), 100 * Math.log((distance + 1) * 100), animate.easeOut).then(bind(this, function () {
					this._endBounce(offset);
				}));
			} else {
				this._endBounce(offset);
			}
		}
	};

	
	this._startBounce = function () {
		this._isBouncing = false;
		if (this._opts.inertia && this._opts.bounce) {
			this._canBounce = true;
		}
	};

	this._endBounce = function () {
		var offset = this.getOffset();
		var bounds = this.getStyleBounds();

		var dx = 0;
		var dy = 0;

		var ty = offset.y, tx = offset.x;
		if (offset.y < bounds.minY) {
			ty = bounds.minY;
		} else if (offset.y > bounds.maxY) {
			ty = bounds.maxY;
		}

		if (offset.x < bounds.minX) {
			tx = bounds.minX;
		} else if (offset.x > bounds.maxX) {
			tx = bounds.maxX;
		}

		dy = ty - offset.y;
		dx = tx - offset.x;

		if (dy === 0 && dx === 0) { return; }

		this._isBouncing = true;
		this._anim.now(bind(this, function (tt, t) {
			this.setOffset(
				offset.x + dx * tt,
				offset.y + dy * tt);
		}), 500, animate.easeInOut).then(bind(this, function () {
			this._canBounce = false;
			this._isBouncing = false;
		}));
	};

	this.setScrollBounds = function (bounds) { this._scrollBounds = bounds; }
	this.getScrollBounds = function () { return this._scrollBounds; }

	this.addOffset = function (x, y) {
		this.setOffset(
				x != undefined && x != null && (this._contentView.style.x + x),
				y != undefined && y != null && (this._contentView.style.y + y)
			);
	}
	
	this.getContentView = function () { return this._contentView; }

	/* @deprecated */
	this.getFullWidth = function () { return this._contentView.style.width; }
	/* @deprecated */
	this.getFullHeight= function () { return this._contentView.style.height; }
	
	function getBoundingRectangle(pos) {
		if (!pos.r) { return; }

		var w = pos.width;
		var h = pos.height;
		var cr = Math.cos(pos.r);
		var sr = Math.sin(pos.r);

		var x1 = pos.x;
		var y1 = pos.y;

		var x = w;
		var y = 0;

		var x2 = x1 + x * cr - y * sr;
		var y2 = y1 + x * sr + y * cr;

		y += h;

		var x3 = x1 + x * cr - y * sr;
		var y3 = y1 + x * sr + y * cr;

		x -= w;

		var x4 = x1 + x * cr - y * sr;
		var y4 = y1 + x * sr + y * cr;

		pos.x = Math.min(x1, x2, x3, x4);
		pos.y = Math.min(y1, y2, y3, y4);

		pos.width = Math.max(x1, x2, x3, x4) - pos.x;
		pos.height = Math.max(y1, y2, y3, y4) - pos.y;
		pos.r = 0;
	};

	function intersect(viewport, prevViewport) {
		var pos = viewport.src.getPosition(prevViewport.src);

		pos.x = (prevViewport.x - pos.x) / pos.scale;
		pos.y = (prevViewport.y - pos.y) / pos.scale;
		pos.width = prevViewport.width / pos.scale;
		pos.height = prevViewport.height / pos.scale;
		pos.r = -pos.r;

		getBoundingRectangle(pos);

		viewport.intersectRect(pos);
	};

	this.render = function (ctx, opts) {
		var s = this.style;
		var cvs = this._contentView.style;

		var viewport = this._viewport;

		var x = viewport.x;
		var y = viewport.y;
		var width = viewport.width;
		var height = viewport.height;

		viewport.x = -cvs.x;
		viewport.y = -cvs.y;

		// TODO: does flooring versus rounding hurt us?
		// NOTE: + 0.5 | 0 for rounding DOES NOT work for negative numbers
		viewport.width = s.width * s.scale | 0;
		viewport.height = s.height * s.scale | 0;

		if (opts.viewport) {
			intersect(viewport, opts.viewport);
		}

		opts.viewport = viewport;

		return viewport.x != x || viewport.y != y || viewport.width != width || viewport.height != height;
	};

	this.onInputScroll = function (evt) {
		if (this._opts.scrollY && evt.scrollAxis == input.VERTICAL_AXIS) {
			this.addOffset(undefined, evt.scrollDelta * 40);
		} else if (this._opts.scrollX) {
			this.addOffset(evt.scrollDelta * 40);
		}

		evt.cancel();
	};

	this.scrollTo = function (x, y, duration, cb) {
		duration = (duration == null ? 500 : duration);
		var bounds = this.getStyleBounds();

		x = -x;
		y = -y;

		x = x < bounds.minX ? bounds.minX : x;
		x = x > bounds.maxX ? bounds.maxX : x;
		y = y < bounds.minY ? bounds.minY : y;
		y = y > bounds.maxY ? bounds.maxY : y;

		var anim = animate(this._contentView).now({ x: x, y: y }, duration, animate.easeOut);

		if (cb) {
			anim.then(cb);
		}
	};
});
