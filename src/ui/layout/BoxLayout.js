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

		if (sv && (force || !style.inLayout || !sv.style.layout || !sv.__layout.reflowsChildren)) {
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

	var isPercent = /%$/;
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
			w = s.right != undefined && s.left != undefined ? availWidth / s.scale - (s.left || 0) - (s.right || 0)
				: isPercent.test(s.layoutWidth) ? availWidth / s.scale * parseFloat(s.layoutWidth) / 100
				: s.aspectRatio ? s.height * s.aspectRatio
				: s.width || availWidth / s.scale;
		}

		if (s.centerX) { s.x = (availWidth - s.scale * w) / 2 + (padding && padding.left || 0); }
		if (s.left == undefined && s.right != undefined) { s.x = availWidth - s.scale * w - s.right - (padding && padding.right || 0); }
		if (s.left != undefined) { s.x = s.left + (padding && padding.left || 0); }

		s.width = Math.min(w, availWidth);

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
			h = s.top != undefined && s.bottom != undefined ? availHeight / s.scale - (s.top || 0) - (s.bottom || 0)
				: isPercent.test(s.layoutHeight) ? availHeight / s.scale * parseFloat(s.layoutHeight) / 100
				: s.aspectRatio ? s.width / s.aspectRatio
				: s.height || availHeight / s.scale;
		}

		if (s.centerY) { s.y = (availHeight - s.scale * h) / 2 + (padding && padding.top || 0); }
		if (s.top == undefined && s.bottom != undefined) { s.y = availHeight - s.scale * h - s.bottom - (padding && padding.bottom || 0); }
		if (s.top != undefined) { s.y = s.top + (padding && padding.top || 0); }

		s.height = Math.min(h, availHeight);

		if (s.centerAnchor) {
			s.anchorY = h / 2;
		}
	}
});


