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

var BoxLayout = exports = Class(function () {

	var cls = this.constructor;

	this.reflowsChildren = false;

	this.init = function (opts) {
		this._view = opts.view;

		cls.initParentListener(opts.view);
	}

	this.reflow = function (force) {
		var view = this._view;
		var sv = view.getSuperview();
		var style = view.style;

		if (sv && (force || !style.inLayout || !sv.style.layout || sv.__layout && !sv.__layout.reflowsChildren)) {
			cls.reflowX(view, sv.style.width);
			cls.reflowY(view, sv.style.height);
		}


	}

	cls.addParentListener = function (view) {
		if (view.style.__removeSuperviewResize) {
			view.style.__removeSuperviewResize();
		}

		// reflow on parent view resize
		var onResize = bind(view, 'needsReflow');
		var superview = view.getSuperview();
		superview && superview.on('Resize', onResize);

		// store a closure to unsubscribe this event
		view.style.__removeSuperviewResize = bind(view.style, function () {
			this.__removeSuperviewResize = null;
			superview && superview.removeListener('Resize', onResize);
		});
	}

	cls.initParentListener = function (view) {
		if (view.__root) { this.addParentListener(view); }

		view.on('ViewAdded', bind(this, 'addParentListener', view));
		view.on('ViewRemoved', bind(view.style, function () {
			this.__removeSuperviewResize && this.__removeSuperviewResize();
		}));
	}

	cls.reflowX = function (view, svWidth, padding) {
		if (!svWidth) { return; }

		var s = view.style;
		var availWidth = (svWidth - (padding && padding.getHorizontal() || 0));

		// compute the width
		var w = 0;
		if (s.layoutWidth == 'wrapContent') {
			// find the maximal right edge
			var views = view.getSubviews();
			for (var i = 0, v; v = views[i]; ++i) {
				var right = v.style.x + v.style.width * v.style.scale;
				if (right > w) {
					w = right;
				}
			}
		} else {
			var sv = view.getSuperview();
			w = s.right != undefined && s.left != undefined ? availWidth / s.scale - (s.left || 0) - (s.right || 0)
				: (s.layoutWidth && s.layoutWidth.charAt(s.layoutWidth.length-1) == '%') ? (availWidth / s.scale) * (parseFloat(s.layoutWidth) / 100)
				: view._opts.width ? view._opts.width
				: s.aspectRatio ? (view._opts.height || s.height) * s.aspectRatio
				: (sv.style.direction == "horizontal" && typeof s.flex == "number") ? availWidth * s.flex / sv._flexSum
				: view._opts.autoSize ? s.width
				: availWidth / s.scale || s.width;
		}

		if (s.centerX) { s.x = (availWidth - s.scale * w) / 2 + (padding && padding.left || 0); }
		if (s.left == undefined && s.right != undefined) { s.x = availWidth - s.scale * w - s.right - (padding && padding.right || 0); }
		if (s.left != undefined) { s.x = s.left + (padding && padding.left || 0); }

		s.width = w;

		if (s.centerAnchor) {
			s.anchorX = w / 2;
		}
	}

	cls.reflowY = function (view, svHeight, padding) {
		if (!svHeight) { return; }

		var s = view.style;
		var availHeight = (svHeight - (padding && padding.getVertical() || 0));

		// compute the height
		var h = 0;
		if (s.layoutHeight == 'wrapContent') {
			// find the maximal right edge
			var views = view.getSubviews();
			for (var i = 0, v; v = views[i]; ++i) {
				var bottom = v.style.y + v.style.height * v.style.scale;
				if (bottom > h) {
					h = bottom;
				}
			}
		} else {
			var sv = view.getSuperview();
			h = s.top != undefined && s.bottom != undefined ? availHeight / s.scale - (s.top || 0) - (s.bottom || 0)
				: (s.layoutHeight && s.layoutHeight.charAt(s.layoutHeight.length-1) == '%') ? (availHeight / s.scale) * (parseFloat(s.layoutHeight) / 100)
				: view._opts.height ? view._opts.height
				: s.aspectRatio ? (view._opts.width || s.width) / s.aspectRatio
				: (sv.style.direction == "vertical" && typeof s.flex == "number") ? availHeight * s.flex / sv._flexSum
				: view._opts.autoSize ? s.height
				: availHeight / s.scale || s.height;
		}

		if (s.centerY) { s.y = (availHeight - s.scale * h) / 2 + (padding && padding.top || 0); }
		if (s.top == undefined && s.bottom != undefined) { s.y = availHeight - s.scale * h - s.bottom - (padding && padding.bottom || 0); }
		if (s.top != undefined) { s.y = s.top + (padding && padding.top || 0); }

		s.height = h;

		if (s.centerAnchor) {
			s.anchorY = h / 2;
		}
	}
});

