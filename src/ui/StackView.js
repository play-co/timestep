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
 * @class ui.StackView;
 * Implements a view which can switch out one of several child views to display at the front.
 *
 * @doc http://doc.gameclosure.com/api/ui-stackview.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/stackview.md
 */

import ui.View as View;
import animate;

/**
 * @extends ui.View
 */
exports = Class(View, function (supr) {
	this.init = function (opts) {
		opts = merge(opts, {
			layout: 'box'
		});
		supr(this, 'init', [opts]);
		this.stack = [];
	};

	this.getStack = function () { return this.stack; };

	this.getCurrentView = function () {
		if (!this.stack.length) { return null; }
		return this.stack[this.stack.length - 1];
	};

	this.push = function (view, dontAnimate, reverse) {
		// don't animate the first (base) view of a stackview unless explicitly asked to
		if (!this.stack[0] && dontAnimate !== false) {
			dontAnimate = true;
		}

		var current = this.getCurrentView();
		if (current) { this._hide(current, dontAnimate); }
		view.style.y = 0;
		view.style.width = this.style.width / view.style.scale;
		view.style.height = this.style.height / view.style.scale;
		this.stack.push(view);
		this._show(view, dontAnimate, reverse);
		return view;
	};

	this._hide = function (view, dontAnimate, reverse) {
		view.publish('ViewWillDisappear');
		if (!dontAnimate) {
			this.getInput().blockEvents = true;
			animate(view)
				.then({x: (reverse ? 1 : -1) * this.style.width})
				.then(bind(this, function () {
					this.removeSubview(view);
					view.publish('ViewDidDisappear');
					this.getInput().blockEvents = false;
				}));
		} else {
			this.removeSubview(view);
			view.publish('ViewDidDisappear');
		}
	};

	this._show = function (view, dontAnimate, reverse) {
		view.publish('ViewWillAppear');
		view.style.visible = true;
		if (!dontAnimate) {
			view.style.x = (reverse ? -1 : 1) * this.style.width;
			this.addSubview(view);
			animate(view)
				.then({x: 0})
				.then(bind(view, 'publish', 'ViewDidAppear'));
		} else {
			this.addSubview(view);
			view.style.x = 0;
			view.publish('ViewDidAppear');
		}
	};

	this.hasView = function (view) {
		return this.stack.indexOf(view) >= 0;
	};

	this.remove = function (view) {
		var i = this.stack.indexOf(view);
		if (i >= 0) {
			this.stack.splice(i, 1);
		}
	}

	this.pop = function (dontAnimate, reverse) {
		if (!this.stack.length) { return false; }
		var view = this.stack.pop();
		//reverse by default
		this._hide(view, dontAnimate, (reverse === false) ? false : true);

		if (this.stack.length) {
			this._show(this.stack[this.stack.length - 1], dontAnimate, true);
		}

		return view;
	};

	this.popAll = function (dontAnimate) {
		while (this.stack[1]) {
			this.pop(dontAnimate);
		}
	};
});
