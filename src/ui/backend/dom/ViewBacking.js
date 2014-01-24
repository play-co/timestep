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

import device;
import event.Callback as Callback;
import animate;
import event.input.InputEvent as InputEvent;
import math.geom.Point as Point;
from util.browser import $;

import ..BaseBacking;

var Canvas = device.get('Canvas');

var AVOID_CSS_ANIM = device.isAndroid;

var TRANSFORM_PREFIX = 'transform';
function CHECK_TRANSLATE3D() {
    var el = document.createElement('p'),
        has3d,
        transforms = {
            'webkitTransform':'-webkit-transform',
            'OTransform':'-o-transform',
            'msTransform':'-ms-transform',
            'MozTransform':'-moz-transform',
            'transform':'transform'
        };

    // Add it to the body to get the computed style.
    document.body.insertBefore(el, null);

    for (var t in transforms) {
        if (el.style[t] !== undefined) {
            el.style[t] = "translate3d(1px,1px,1px)";
            has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
            TRANSFORM_PREFIX = t;
        }
    }

    document.body.removeChild(el);

    return (has3d !== undefined && has3d.length > 0 && has3d !== "none");
}

var SUPPORTS_TRANSLATE3D = false;//CHECK_TRANSLATE3D();


var ViewBacking = exports = Class(BaseBacking, function () {

	var arr = ['x', 'y', 'r', 'width', 'height', 'visible', 'anchorX', 'anchorY', 'offsetX', 'offsetY',
			   'opacity', 'scale', 'zIndex', 'scrollLeft', 'scrollTop', 'flipX', 'flipY'];

	var CUSTOM_KEYS = {};

	arr.forEach(function (prop) {
		CUSTOM_KEYS[prop] = true;

		this.__defineGetter__(prop, function () {
			if (prop in this._computed) {
				return this._computed[prop];
			} else {
				return parseInt(this._node.style[prop]);
			}
		});
		this.__defineSetter__(prop, function (val) {
			var props = {};
			props[prop] = val;
			this._setProps(props);
			return val;
		});
	}, this);

	this.init = function (view, opts) {
		this._view = view;
		this._subviews = [];
		this._noCanvas = opts['dom:noCanvas'];

		var n = this._node = document.createElement(opts['dom:elementType'] || 'div');

		// used to identify dom nodes
		n._view = view;
		n.addEventListener("webkitTransitionEnd", bind(this, "_transitionEnd"), false);
		n.className = 'view';
		if (opts['dom:className']) {
			n.className += ' ' + opts['dom:className'];
		}

		var cssText = 'fontSize:1px;position:absolute;top:0px;left:0px;-webkit-transform-origin:0px 0px;';
		if (!device.isAndroid) {
			cssText += '-webkit-backface-visibility:hidden;';
		}

		var s = n.style;
		s.cssText = cssText;

		this.position(0, 0);

		// add any custom CSS style
		var domStyles = opts['dom:styles'];

		for (var name in domStyles) {
			s[name] = domStyles[name];
		}

		// store for the computed styles
		this._computed = {
			x: 0,
			y: 0,
			r: 0,
			width: undefined,
			height: undefined,
			anchorX: 0,
			anchorY: 0,
			offsetX: 0,
			offsetY: 0,
			opacity: 1,
			visible: true,
			zIndex: 0,
			scale: 1
		};

		// animation
		this._view.getAnimation = function () { return this.__view; }
		this._animating = false;
		this._animationQueue = [];
		this._animationCallback = null;

		// put the initial view tag into the view tree for easier debugging
		if (DEBUG) {
			n.setAttribute("TAG:", view.getTag());
		}
	}

	this.getElement = function () { return this._node; }

	var ADD_COUNTER = 900000;
	this.addSubview = function (view) {
		var backing = view.__view;
		var node = backing._node;
		var superview = node.parentNode && node.parentNode._view;
		if (superview == this._view) {
			return false;
		} else {
			if (superview) { superview.__view.removeSubview(view); }
			var n = this._subviews.length;
			this._subviews[n] = backing;
			this._node.appendChild(node);

			backing._setAddedAt(++ADD_COUNTER);
			if (n && backing.__sortKey < this._subviews[n - 1].__sortKey) {
				this._needsSort = true;
			}

			return true;
		}
	}

	this.removeSubview = function (targetView) {
		var index = this._subviews.indexOf(targetView.__view);
		if (index != -1) {
			this._subviews.splice(index, 1);
			this._node.removeChild(targetView.__view._node);
			return true;
		}

		return false;
	}

	this.getSuperview = function () {
		var p = this._node.parentNode;
		if (p == document.body || !p) {
			return null;
		}

		return p._view;
	}

	this.getSubviews = function () {
		if (this._needsSort) { this._needsSort = false; this._subviews.sort(); }
		var subviews = [];
		var n = this._subviews.length;
		for (var i = 0; i < n; ++i) {
			subviews[i] = this._subviews[i]._view;
		}
		return subviews;
	}

	this.wrapTick = function (dt, app) {
		this._view.tick && this._view.tick(dt, app);

		for (var i = 0, view; view = this._subviews[i]; ++i) {
			view.wrapTick(dt, app);
		}
	}

	this.wrapRender = function (ctx, opts) {
		if (!this.visible) { return; }

		if (!this.__firstRender) { this._view.needsReflow(true); }
		if (this._needsSort) { this._needsSort = false; this._subviews.sort(); }


		var width = this._computed.width;
		var height = this._computed.height;
		if (width < 0 || height < 0) { return; }

		// var filters = this._view.getFilters();
		// ctx.setFilters(filters);

		try {
			var render = this._view.render;
			if (render && !render.isFake) {
				this._render(render, width, height, opts);
			}

			this._renderSubviews(ctx, opts);
		} catch(e) {
		 	logger.error(this, e.message, e.stack);
		}
	}

	this._render = function (render, width, height, opts) {
		if (this._noCanvas) {
			render.call(this._view, null, opts);
		} else {
			if (!this._canvas) {
				var canvas = new Canvas();
				this._canvas = canvas;
				this._node.insertBefore(this._canvas, this._node.firstChild);
				this.ctx = this._canvas.getContext('2d');
			}

			var needsRepaint = this._view._needsRepaint;

			// clear the canvas
			if ((width | 0) != this._canvas.width || (height | 0) != this._canvas.height) {
				needsRepaint = true;
				this._canvas.width = width;
				this._canvas.height = height;
			}

			if (needsRepaint) {
				this._view._needsRepaint = false;
				this._canvas.style.display = 'none';
				this.ctx.clear();
				// this.ctx.fillStyle = 'red';
				// this.ctx.fillRect(0, 0, 1000, 1000);
				this.ctx.save();
				render.call(this._view, this.ctx, opts);
				this.ctx.restore();
				this._canvas.style.display = 'block';
			}
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

	this.localizePoint = function (pt) {
		var s = this._computed;
		pt.x -= s.x + s.anchorX + s.offsetX;
		pt.y -= s.y + s.anchorY + s.offsetY;
		if (s.r) { pt.rotate(-s.r); }
		pt.scale(1 / s.scale);
		pt.x += s.anchorX;
		pt.y += s.anchorY;
		return pt;
	}

	// exports the current style object
	this.copy = function () {
		return merge({}, this._computed);
	}

	this.update = function (style) { this._setProps(style); }

	this.position = function (x, y) {
		var s = this._node.style;

		if (SUPPORTS_TRANSLATE3D) {
			var translate = 'translate3d(' + (x) + 'px,' + (y) + 'px,0)';

			// Check for differences and other properties like scale, rotate, translate, etc
			if (s[TRANSFORM_PREFIX] != '' && s[TRANSFORM_PREFIX] != translate) {
				s[TRANSFORM_PREFIX] += translate;
			}
			else {
				s[TRANSFORM_PREFIX] = translate;
			}

		}
		else {
			s.left = x + 'px';
			s.top = y + 'px';
		}
	};

	//****************************************************************
	// ANIMATION

	function getEasing(fn) {
		if (typeof fn == 'string') { return fn; }
		if (fn == animate.easeIn) { return 'ease-in'; }
		if (fn == animate.easeOut) { return 'ease-out'; }
		if (fn == animate.easeInOut) { return 'ease-in-out'; }
		if (fn == animate.linear) { return 'linear'; }
		return 'ease';
	};

	this._updateOrigin = function () {
		this._node.style.webkitTransformOrigin = (this._computed.anchorX || 0) + 'px ' + (this._computed.anchorY || 0) + 'px';
	}

	this._setProps = function (props, anim) {
		var setMatrix = false;
		var s = this._node.style;
		var animCount = 0;
		var resized = false;
		var previous = {};
		for (var key in props) {
			var value = props[key];
			if (key == "dx" || key == "dy") {
				key = key.substr(1);
				value = this._computed[key] + value;
			}
			switch (key) {
				case "anchorX":
				case "anchorY":
					this._computed[key] = value;
					this._updateOrigin();
					break;
				case "clip":
					this._computed.clip = value;
					s.overflow = value ? 'hidden' : 'visible';
					break;
				case "zIndex":
					if (this._computed.zIndex != value) {
						this._computed.zIndex = value;
						s.zIndex = value;
						this._onZIndex(value);
					}
					break;
				case "offsetX":
				case "offsetY":
				case "x":
				case "y":
				case "r":
				case "scale":
					if (this._computed[key] != value) {
						previous[key] = this._computed[key];
						this._computed[key] = value;
						setMatrix = true;
					}
					break;
				default:
					if (this._computed[key] != value) {
						++animCount;
					    this._computed[key] = value;
						if (key == 'width' || key == 'height') {
							s[key] = value + 'px';
							resized = true;
						} else if (key == 'visible') {
							s.display = (value ? this._displayStyle || 'block' : 'none');
							//s.visibility = (value ? 'visible' : 'hidden');
							// chrome has an obscure rendering bug where visibility:hidden won't
							// hide the canvas element child nodes sometimes. If you set opacity to zero, it will.
							//s.opacity = (value ? this._computed['opacity'] : 0);

						} else if (key == 'opacity') {
							s[key] = value;
						} else {
							s[key] = value;

							if (!CUSTOM_KEYS[key]) {
								this[key] = value;
							}
						}

					}
					break;
			}
		}
		if (setMatrix) {
			++animCount;

			var c = this._computed;
			var x = (this._center ? -c.width / 2 | 0 : 0) + c.x + c.offsetX;
			var y = (this._center ? -c.height / 2 | 0 : 0) + c.y + c.offsetY;

			if (AVOID_CSS_ANIM) {
				var obj = {
					scale: previous.scale || c.scale,
					r: previous.r || c.r
				};

				// because of android bugs,
				// we must never animate -webkit-transform.
				// http://code.google.com/p/android/issues/detail?id=12451
				// TODO: is this fixed in Android > 2.2? Chrome?
				if (anim && ((obj.scale != c.scale) ||
							 (obj.r != c.r))) {
					// logger.log('set transform animated', obj.scale, c.scale, obj.r, c.r);
					animate(obj).now({
						scale: c.scale,
						r: c.r
					}, anim.duration, anim.easing, bind(this, function () {
						s.WebkitTransform = ('scale(' + (c.flipX ? obj.scale * -1 : obj.scale) +
											 ',' + (c.flipY ? obj.scale * -1 : obj.scale) + ') ' +
											 'rotate(' + obj.r + 'rad)');
					})).then(bind(this, function () {
						s.WebkitTransform = ('scale(' + (c.flipX ? obj.scale * -1 : obj.scale) +
											 ',' + (c.flipY ? obj.scale * -1 : obj.scale) + ') '  +
											 'rotate(' + c.r + 'rad)');
					}));

				} else if ((obj.scale != c.scale) ||
						   (obj.r != c.r)) {
					// logger.log('set transform', c.scale, c.r);
					s.WebkitTransform = ('scale(' + (c.flipX ? c.scale * -1 : c.scale) +
											',' + (c.flipY ? c.scale * -1 : c.scale) + ') ' +
										 'rotate(' + c.r + 'rad)');
				}

				// use CSS animations for left and top though, since
				// those can still be taken out of javascript.
				this.position(x, y);
			} else {
				var matrix = new WebKitCSSMatrix();
				matrix = matrix.translate(x, y);
				matrix = matrix.rotate(c.r * 180 / 3.14159);
				matrix = matrix.scale(c.scale);

				if (c.flipX || c.flipY) {
					matrix = matrix.translate(
						c.flipX ? -c.width : 0,
						c.flipY ? c.height / 2 : 0
					);
					matrix = matrix.scale(
						c.flipX ? -1 : 1,
						c.flipY ? -1 : 1
					);
					matrix = matrix.translate(
						c.flipX ? c.width : 0,
						c.flipY ? -c.height / 2 : 0
					);
				}

				// on iOS, forcing a 3D matrix provides huge performance gains.
				// Rotate it about the y axis 360 degrees to achieve this.
				matrix = matrix.rotate(0, 360, 0);
				s.WebkitTransform = matrix;
			}
		}

		if (resized) {
			this._view.needsReflow();
		}

		return animCount;
	};

	// ----- zIndex -----

	var LEN_Z = 8;
	var MAX_Z = 99999999;
	var MIN_Z = -99999999;
	var PAD = "00000000";

	this._sortIndex = "00000000";

	this._onZIndex = function (zIndex) {
		zIndex = ~~zIndex;

		if (zIndex < MIN_Z) { zIndex = this._zIndex = MIN_Z; }
		if (zIndex > MAX_Z) { zIndex = this._zIndex = MAX_Z; }
		if (zIndex < 0) {
			zIndex *= -1;
			this._sortIndex = '-' + PAD.substring(0, LEN_Z - ('' + zIndex).length) + zIndex;
		} else {
			this._sortIndex = PAD.substring(0, LEN_Z - ('' + zIndex).length) + zIndex;
		}

		this._setSortKey();
	}

	this._setAddedAt = function (addedAt) {
		this._addedAt = addedAt;
		this._setSortKey();
	}

	this._setSortKey = function () { this.__sortKey = this._sortIndex + this._addedAt; }
	this.toString = function () { return this.__sortKey; }

	// ----- ANIMATION -----

	this._transitionEnd = function (evt) {
		$.stopEvent(evt);
		if (this.transitionCallback.fired()) {
			return;
		}

		this.transitionCallback.fire();
		this.transitionCallback.reset();

		if (evt) {
			evt.cancelBubble = true;
		} else if (this._transitionEndTimeout) {
			this._transitionEndTimeout = null;
		}

		this._node.style.webkitTransition = "none";

		this._animating = false;
		if (this._animationCallback) {
			var callback = this._animationCallback;
			this._animationCallback = null;
			callback();
		}

		this._processAnimation();
	};


	this._processAnimation = function (doNow) {
		if (this._animationQueue.length == 0 || this._isPaused) {
			return;
		}
		if (doNow) {
				clearTimeout(this._queuedTimeout);
				this._queuedTimeout = null;
		}
		if (this._queuedTimeout) {
			return;
		}
		if (!doNow) {
			if (!this._queuedTimeout) {
				this._queuedTimeout = setTimeout(bind(this, function () {
					this._queuedTimeout = false;
					this._processAnimation(true);
				}), 0);
			}
			return;
		}

		var anim = this._animationQueue.shift();
		switch (anim.type) {
		case "animate":
			var s = this._node.style;
			if (AVOID_CSS_ANIM) {
				s.webkitTransitionProperty = "left, top, opacity, width, height";
			} else {
				s.webkitTransitionProperty = "-webkit-transform, opacity, width, height";
			}
			s.webkitTransitionDuration = (anim.duration|0) + "ms";
			s.webkitTransitionTimingFunction = getEasing(anim.easing);
			this._setProps(anim.props, anim);

			// fall through
		case "wait":
			this._animating = true;
			this._animationCallback = anim.callback || null;

			this.transitionCallback = new Callback();

			this.transitionCallback.runOrTimeout(function () {
				// if webkitTransitionEnd fires, do nothing
			}, bind(this, function (evt) {
				// webkitTransitionEnd is too late, baby, it's too late
				this._transitionEnd(evt);
			}), anim.duration);
			break;
		case "callback":
			//logger.log('doing callback', anim.callback, doNow);
			anim.callback();
			if (!this._animating) {
				this._processAnimation();
			}
			break;
		}

	};

	this.getQueue = function () {
		return [];
	}
	this.getAnimation = function () {
		return this;
	}

	this.animate = function () {
		if (!arguments[0]) {
			return this;
		}
		return this.next.apply(this, arguments);
	}

	this.clear = function () {
		this.transitionCallback && this.transitionCallback.fire();
		if (this._transitionEndTimeout) {
			clearTimeout(this._transitionEndTimeout);
		}
		this._animationQueue = [];
		this._animationCallback = null;
		this._animating = false;
		return this;
	};

	this.commit = function () {
		this._node.style.webkitTransition = 'none';
		var queue = this._animationQueue;
		this._animationQueue = [];
		var n = queue.length;
		for (var i = 0; i < n; ++i) {
			var anim = queue[i];
			switch (anim.type) {
				case "animate":
					this._setProps(anim.props);
					break;
				case "wait":
					break;
				case "callback":
					anim.callback();
					break;
			}
		}
		return this;
	}

	var DURATION = 600;

	this.pause = function () {
		this._isPaused = true;
	}

	this.resume = function () {
		this._isPaused = false;
		this._processAnimation();
	}

	this.animate = function (props, duration, easing, callback) {
		//this.clear();
		return this.then(props, duration, easing, callback);
	};

	this.now = function (props, duration, easing, callback) {
		this.clear();
		return this.then(props, duration, easing, callback);
	}

	this.then = function (props, duration, easing, callback) {
		if (arguments.length == 1 && typeof props === 'function') {
			return this.callback(props);
		}
		this._animationQueue.push({
			type: "animate",
			props: props,
			duration: duration || DURATION,
			callback: callback && bind(this, callback),
			easing: easing
		});
		if (this._animationQueue.length == 1 && !this._animating) {
			this._processAnimation();
		}
		return this;
	};

	this.callback = function (fn) {
		this._animationQueue.push({
			type: "callback",
			duration: 0,
			callback: fn && bind(this, fn)
		});
		if (this._animationQueue.length == 1 && !this._animating) {
			this._processAnimation();
		}
		return this;
	}

	this.wait = function (duration, callback) {
		this._animationQueue.push({
			type: "wait",
			duration: duration,
			callback: callback
		});
		if (this._animationQueue.length == 1 && !this._animating) {
			this._processAnimation();
		}
		return this;
	};

	this.fadeIn = function (duration, callback) {
		this.show();

		if (this._node.style.opacity == 1) {
			if (callback) {
				callback();
			}
			return;
		}

		this.then({
			opacity: 1
		}, duration, null, callback);
		return this;
	};

	this.fadeOut = function (duration, callback) {
		if (this._node.style.opacity == 0) {
			this.hide();
			if (callback) {
				callback();
			}
			return;
		}

		this.then({
			opacity: 0
		}, duration, null, bind(this, function () {
			this.hide();
			if (callback) {
				callback();
			}
		}));

		return this;
	};

});

