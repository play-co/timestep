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
 * package ui.layout.LinearLayout;
 *
 * A class to direct the layout of its parent view, set through opts.parent.
 */

import ui.layout.Padding as Padding;

import .BoxLayout;

var DEBUG = false;

// TODO: native
// TODO: Resize event on width/height change
// TODO: reflow on subview visibility change

exports = Class(BoxLayout, function (supr) {

	// set to true to tell other layouts not to try to control the child layout
	this.reflowsChildren = true;

	this.init = function (opts) {
		this._view = opts.view;
		this._view.subscribe('SubviewAdded', this, '_onSubviewAdded');
		this._view.subscribe('SubviewRemoved', this, '_onSubviewRemoved');

		this.setDirection(opts.isVertical ? 'vertical' : 'horizontal');

		this._views = [];
		var subviews = this._view.getSubviews();
		for (var i = 0, view; view = subviews[i]; ++i) {
			if (view.style.inLayout) {
				this._views.push(this._initLayoutView(view));
			}
		}

		this._forwardEvents();

		this._debug = DEBUG;
	}

	this._onSubviewRemoved = function (view) {
		if (view.style.inLayout) {
			this.remove(view);
		}
	}

	this._onSubviewAdded = function (view) {
		if (view.style.inLayout) {
			this.add(view);
		}
	}

	this.debug = function () { this._debug = true; return this; }

	/**
	 * Set which language to use, for horizontal or vertical layout.
	 * @param String direction One of "horizontal" or "vertical".
	 */

	this.setDirection = function (direction) {
		this._direction = direction;

		var isVertical = direction == 'vertical';
		this._propPos = isVertical ? 'y' : 'x';
		this._propPosOpp = isVertical ? 'x' : 'y';
		this._propDim = isVertical ? 'height' : 'width';
		this._minPropDim = isVertical ? 'minHeight' : 'minWidth';
		this._maxPropDim = isVertical ? 'maxHeight' : 'maxWidth';
		this._propDimOpp = isVertical ? 'width' : 'height';
		this._propSideA = isVertical ? 'top' : 'left';
		this._propSideB = isVertical ? 'bottom' : 'right';

		this._flexProp = isVertical ? 'vflex' : 'hflex';

		this._view.needsReflow();
		return this;
	}

	this.getDirection = function () { return this._direction; }

	/**
	 * Events to proxy to the parent view from this layout.
	 */
	this._events = ['ViewWillAppear', 'ViewDidAppear', 'ViewWillDisappear', 'ViewDidDisappear'];

	this._forwardEvents = function () {
		for (var i = 0, a; a = this._events[i]; ++i) {
			this._view.subscribe(a, this, '_forwardSignal', a);
		}
	};

	this._events = ['ViewWillAppear', 'ViewDidAppear', 'ViewWillDisappear', 'ViewDidDisappear'];

	/**
	 * Emit events on the children. Variable arguments.
	 */

	this._forwardSignal = function () {
		for (var i = 0, v; v = this._views[i]; ++i) {
			v.view.publish.apply(v.view, arguments);
		}
	};

	/**
	 * Initialize a subview controlled by this layout.
	 */

	this._initLayoutView = function (view) {
		view.style.inLayout = true;

		this._debug && logger.log(this._view.uid, 'adding view', view.uid, this._propDim, view.style[this._propDim]);

		this._view.connectEvent(view, 'Resize', bind(this, 'reflow'));

		return {
			view: view,
			index: 0,
			toString: toStringSort
		};
	};

	function toStringSort () {
		return this.view.style._sortOrder + this.index;
	}

	/**
	 * Return the size of this element (in its cardinal direction).
	 */

	this.getSize = function () {
		return this._size;
	};

	/**
	 * Return the index of a subview.
	 */

	this.getViewIndex = function (view) {
		for (var i = 0, d; d = this._views[i]; ++i) {
			if (d.view == view) {
				return i;
			}
		}
		return -1;
	};

	/**
	 * Add an array of subviews to this element in batch (prevent reflow each
	 * time).
	 */

	this.addSubviews = function (views) {
		this._debug && logger.log(this._view.uid, "adding", views.length, "views");
		if (isArray(views)) {
			for (var i = 0, n = views.length; i < n; ++i) {
				var view = views[i];
				if (view) {
					this._views.push(this._initLayoutView(view));
				}
			}

			this._view.needsReflow();
		} else {
			this.insertBefore(views);
		}

		return this;
	}

	/**
	 * Return the list of subviews controlled by this layout.
	 */

	this.getSubviews = function () {
		return this._views.map(function (v) { return v.view; });
	};

	/**
	 * Remove a subview controlled by this layout.
	 */

	this.remove = function (view) {
		var i = this.getViewIndex(view);
		if (i != -1) {
			this._views.splice(i, 1);
			this._view.disconnectEvent(view, 'Resize');
			this._view.needsReflow();
			return;
		}
	}

	/**
	 * Insert a subview before another subview in this hierarchy.
	 */

	this.add =
	this.insertBefore = function (view, before) {

		if (this.getViewIndex(view) != -1) { return; }

		var item = this._initLayoutView(view);
		var added = false;
		if (before) {
			var i = this.getViewIndex(before);
			if (i != -1) {
				this._views.splice(i, 0, item);
				added = true;
			}
		}

		if (!added) {
			this._views.push(item);
		}

		this._view.needsReflow();
	}

	/**
	 * Insert a subview after another subview in this hierarchy.
	 */

	this.insertAfter = function (view, after) {

		if (this.getViewIndex(view) != -1) { return; }

		var item = this._initLayoutView(view);
		var added = false;
		if (after) {
			var i = this.getViewIndex(after);
			if (i != -1) {
				this._views.splice(i + 1, 0, item);
				added = true;
			}
		}

		if (!added) {
			this._views.unshift(item);
		}

		this._view.needsReflow();
	}

	/**
	 * Reflow logic.
	 */

	this.reflow = function () {
		supr(this, 'reflow', arguments);

		// style.order is first, then default to standard view sort order
		var n = 0;
		for (var i = 0, v; v = this._views[i]; ++i) {
			if (v.view.style.visible) {
				// TODO: this won't work on native
				v.index = v.view.style.__sortKey;

				++n;
			}
		}

		if (!n) { return; }

		this._views.sort();

		if (DEBUG) {
			var uid = this._view.uid;
			// _debug.views[uid] = +new Date();
		}

		var layoutStyle = this._view.style;
		if (layoutStyle.direction != this._direction) {
			this.setDirection(layoutStyle.direction);
		}

		var scale = this._view.getPosition().scale;

		var isVertical = this._direction == 'vertical';
		var propDim = this._propDim;
		var propDimOpp = this._propDimOpp;
		var minPropDim = this._minPropDim;
		var propA = this._propSideA;
		var propB = this._propSideB;
		var padding = layoutStyle.padding;
		var paddingSum = padding && (isVertical ? padding.getVertical() : padding.getHorizontal()) || 0;
		var parentDim = layoutStyle[propDim];
		var views = this._views;

		this._debug && logger.log('reflow() view', uid + ':', views.length, 'subview(s)');

		// compute the total size of the fixed views and count
		// how many dynamically sized views we have
		var sum = 0;
		var flexSum = 0;
		var paddingOpp = padding && (isVertical ? padding.getHorizontal() : padding.getVertical()) || 0;
		for (var i = 0, v; v = views[i]; ++i) {
			var s = v.view.style;
			if (!s.visible) { continue; }

			v.margins = (s[propA] || 0) + (s[propB] || 0);

			if (isVertical && s.layoutHeight && s.layoutHeight.charAt(s.layoutHeight.length-1) == '%') {
				sum += parentDim * parseFloat(s.layoutHeight) / 100;
			} else if (!isVertical && s.layoutWidth && s.layoutWidth.charAt(s.layoutWidth.length-1) == '%') {
				sum += parentDim * parseFloat(s.layoutWidth) / 100;
			} else if (s.flex) {
				flexSum += s.flex;
				v.baseSize = s[minPropDim] || 0;
				sum += v.baseSize;
			} else {
				sum += (s[propDim] || 0) * s.scale + v.margins;
			}

			// LinearViews should reflow the opposite direction
			if (padding) {
				s.x = padding.left;
				s.y = padding.top;
			}
		}
		this._view._flexSum = flexSum;
		for (var i = 0, v; v = views[i]; ++i) {
			BoxLayout.reflowX(v.view, layoutStyle.width, padding);
			BoxLayout.reflowY(v.view, layoutStyle.height, padding);
		}

		if (flexSum && parentDim == undefined) { return; }

		// compute available space
		var availableSpace = parentDim - paddingSum;
		if (availableSpace < 0) { return; }

		// if there's a flex subview or (?), the total size is the availableSpace
		// otherwise the totalSize is the sum of the subview sizes
		var justifyContent = layoutStyle.justifyContent;
		var totalSize = (flexSum || justifyContent != 'start' ? availableSpace : sum) + paddingSum;
		var flexSize = availableSpace - sum;

		//
		var layoutDim = isVertical ? 'layoutHeight' : 'layoutWidth';
		if (!flexSum && layoutStyle[layoutDim] == 'wrapContent') {
			this._debug && logger.log('  view', uid, '(sizing to fit)', propDim, '=', totalSize + 'px', '(' + paddingSum + 'px padding)');
			layoutStyle[propDim] = totalSize;
		}

		// compute the space for each flexible view
		var flexUsed = 0;
		var balance = 0;
		for (var i = 0, v; v = views[i]; ++i) {
			var s = v.view.style;
			if (!s.visible) { continue; }

			if (s.flex) {
				// compute the ideal space for the flex view
				var idealSpace = v.baseSize + flexSize * (s.flex / flexSum) / s.scale + balance;

				// round to the nearest screen pixel (take into account the global scale of the layout view)
				var roundedSpace = Math.round(idealSpace / scale) * scale;

				// propogate the balance into the next view space computation
				balance = idealSpace - roundedSpace;

				// store the actual space for the view, which is the computed space minus the margins
				v.dim = roundedSpace - v.margins;

				// account for maximal bound
				if (v.dim > s[this._maxPropDim]) {
					v.dim = s[this._maxPropDim];
				}

				// keep track of used flex space
				flexUsed += roundedSpace;
			}
		}

		var flexRemaining = flexSize - flexUsed;

		// set the position of the views
		var pos = padding && padding[propA] || 0;
		var gap = 0;
		if (flexRemaining > 0) {
			// there's unused space, so justify our views
			switch (justifyContent) {
				case 'end':
					pos += flexRemaining;
					break;
				case 'center':
					pos += flexRemaining / 2;
					break;
				case 'space':
					gap = flexRemaining / (n - 1) || 0;
					break;
				case 'space-outside':
					gap = flexRemaining / (n + 1) || 0;
					pos += gap;
					break;
				case 'start':
				default:
					break;
			}
		}

		// position and size views!
		var propPos = this._propPos;
		for (var i = 0, v; v = views[i]; ++i) {
			var s = v.view.style;
			if (!s.visible) { continue; }

			// set position
			s[propPos] = pos + (s[propA] || 0);

			this._debug && logger.log('  view', uid, 'layout subview', v.view.uid, propPos, '=', s[propPos]);

			if (s.flex) {
				// set width
				s[propDim] = v.dim;
				if (s.aspectRatio) {
					s.enforceAspectRatio()
				}

				this._debug && logger.log('  view', uid, 'layout subview', v.view.uid, propDim, '=', s[propDim]);
			}

			// advance position
			pos += gap + (s[propDim] || 0) * s.scale + v.margins;
		}

		if (this._size != totalSize) {
			this._size = totalSize;
			this._view.publish('LayoutResize', totalSize);
		}
	};
});

