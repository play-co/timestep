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

import ..View;
import ..backend.strPad as strPad;
import ..backend.BaseBacking;
import .BoxLayout;
import .LinearLayout;
import .Padding;

import util.setProperty;

var layoutProps = {
		'layout': {value: false, cb: '_onSetLayout'},
		'inLayout': {value: true, cb: '_onInLayout'},
		'order': {value: 0, cb: '_onOrder'},
		'direction': {value: 'down', cb: '_onLayoutChange'},
		'flex': {value: 0, cb: '_onLayoutChange'},
		'halign': {value: 'start'}, 'halignSelf': {value: undefined},
		'valign': {value: 'start'}, 'valignSelf': {value: undefined},

		'centerX': {value: false},
		'centerY': {value: false},

		'top': {value: undefined, cb: '_onLayoutChange'},
		'right': {value: undefined, cb: '_onLayoutChange'},
		'bottom': {value: undefined, cb: '_onLayoutChange'},
		'left': {value: undefined, cb: '_onLayoutChange'},

		'justifyContent': {value: 'start', cb: '_onLayoutChange'},
		'sizeContainerToFit': {value: false, cb: '_onLayoutChange'},

		'minWidth': {value: undefined, cb: '_onLayoutChange'},
		'minHeight': {value: undefined, cb: '_onLayoutChange'},
		'maxWidth': {value: undefined, cb: '_onLayoutChange'},
		'maxHeight': {value: undefined, cb: '_onLayoutChange'},

		'layoutWidth': {value: undefined, cb: '_onLayoutChange'},
		'layoutHeight': {value: undefined, cb: '_onLayoutChange'},

		'fixedAspectRatio': {value: false, cb: '_onFixedAspectRatio'},
		'aspectRatio': {value: null, cb: '_onLayoutChange'},

		'margin': {value: null, cb: '_onMarginChange'}
	};

for (var key in layoutProps) {
	backend.BaseBacking.addProperty(key, layoutProps[key]);
}

util.setProperty(backend.BaseBacking.prototype, 'padding', {
	get: function () {
		return this._padding || (this._padding = new Padding());
	},
	set: function (value) {
		if (this._padding) {
			this._padding.update(value);
		} else {
			this._padding = new Padding(value);
		}

		this._onLayoutChange();
	}
});

View.addExtension({
	extend: function (ViewBacking) {

		var proto = ViewBacking.prototype;

		proto._sortOrder = strPad.initialValue;
		proto._onOrder = function(_, order) {
			this._sortOrder = strPad.pad(order);
			this._onLayoutChange();
		};
		
		proto._onMarginChange = function (key, value) {
			if (this._cachedMargin) {
				this._cachedMargin.update(value);
			} else {
				this._cachedMargin = new Padding(value);
			}

			this.top = this._cachedMargin.top;
			this.bottom = this._cachedMargin.bottom;
			this.left = this._cachedMargin.left;
			this.right = this._cachedMargin.right;

			this._onLayoutChange();
		}

		proto._onFixedAspectRatio = function (key, value) {
			if (value) {
				this.updateAspectRatio();
			}
		}

		proto.updateAspectRatio = function (w, h) {
			this.aspectRatio = (w || this.width) / (h || this.height);
		}

		proto._onSetLayout = function (key, which) {
			switch (which) {
				case 'linear':
					this._view.__layout = new LinearLayout({view: this._view});
					break;
				case 'box':
					this._view.__layout = new BoxLayout({view: this._view});
					break;
			}
		};

		proto._onInLayout = function (key, value) {
			var layout = this._superview && this._superview.__layout;
			if (layout) {
				if (value) {
					layout.add(this._view);
				} else {
					layout.remove(this._view);
					this._view.needsReflow();
				}
			}
		}
		
		// var isPercent = /%$/;
		// proto._onLayoutSizeChange = function (key, value, oldValue) {
		// 	// Subscribes a view to parent resize events when the view is in the hierarchy and
		// 	// contains a percentage height or width.
		// 	//
		// 	// NOTE: a view only sets up resize listeners once -- if layoutWidth is set to a percent and then reset
		// 	// to not have a percent, it will still get reflow events when its superview resizes.  We could
		// 	// remove the listeners once the view no longer has percentages.
		// 	if (!this._hasResizeListeners && (isPercent.test(this._layoutWidth) || isPercent.test(this._layoutHeight))) {
		// 		this._hasResizeListeners = true;
		// 		this._view.on('ViewAdded', bind(this, function () {
		// 			if (this.__superviewResize) {
		// 				this.__superviewResize();
		// 			}
					
		// 			var superview = this._view.getSuperview();
		// 			var onResize = bind(this._view, 'needsReflow');
		// 			superview.on('Resize', onResize);
					
		// 			this.__superviewResize = bind(this, function () {
		// 				this.__superviewResize = null;
		// 				superview.removeListener('Resize', onResize);
		// 			});
		// 		}));
				
		// 		this._view.on('ViewRemoved', bind(this, function (superview) {
		// 			if (this.__superviewResize) { this.__superviewResize(); }
		// 		}));
		// 	}
			
		// 	this._onLayoutChange();
		// }

		proto._onLayoutChange = function () {
			var superview = this.getSuperview();
			if (superview && superview.__layout) {
				superview.needsReflow();
			}

			this._view.needsReflow();
		}
	}
});
