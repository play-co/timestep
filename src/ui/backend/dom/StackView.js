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

import ui.View;

/**
 * @extends timestep.dom.View
 */
exports = Class(View, function (supr) {

	this.init = function (opts) {
		supr(this, 'init', arguments);
		this.stack = [];
	}
	
	this.getCurrentView = function () {
		if (!this.stack.length) { return null; }
		return this.stack[this.stack.length - 1];
	}
	
	this.push = function (view, dontAnimate) {
		// don't animate the first (base) view of a stackview unless explicitly asked to
		if (!this.stack[0] && dontAnimate !== false) {
			dontAnimate = true;
		}
		
		var current = this.getCurrentView();
		if (current) { this._hide(current, dontAnimate); }
		view.style.width = this.style.width;
		view.style.height = this.style.height;
		this.stack.push(view);
		this._show(view, dontAnimate);
		return view;
	}
	
	this._hide = function (view, dontAnimate, backward) {
		view.publish('ViewWillDisappear');
		if (!dontAnimate) {
			// Prevent touches from triggering buttons/UI on the
			// disappearing view. Unfortunately, canHandleEvents()
			// doesn't affect subviews, so an overlay is added here
			// so that touches just don't go through while it animates out.
			var overlay = new View({parent: view, zIndex: 100000});
			view.then({x: (backward ? 1 : -1) * view.style.width})
				.then(bind(this, 'removeSubview', view))
				.then(bind(view, 'publish', 'ViewDidDisappear'))
				.then(bind(overlay, 'removeFromSuperview'));
		} else {
			this.removeSubview(view);
			view.publish('ViewDidDisappear');
		}
	}

	this._show = function (view, dontAnimate, backward) {
		view.publish('ViewWillAppear');
		view.style.visible = true;
		if (!dontAnimate) {
			view.style.x = (backward ? -1 : 1) * this.style.width;
			this.addSubview(view);
			view.then({x: 0})
				.then(bind(view, 'publish', 'ViewDidAppear'));
		} else {
			this.addSubview(view);
			view.style.x = 0;
			view.publish('ViewDidAppear');
		}
	}
	
	this.pop = function (dontAnimate) {
		if (!this.stack.length) { return false; }
		var view = this.stack.pop();
		this._hide(view, dontAnimate, true);
		
		if (this.stack.length) {
			this._show(this.stack[this.stack.length - 1], dontAnimate, true);
		}
		
		return view;
	}
	
	this.popAll = function (dontAnimate) {
		while (this.stack[1]) {
			this.pop(dontAnimate);
		}
	}
});
