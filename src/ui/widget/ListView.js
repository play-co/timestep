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
 * @class ui.widget.ListView;
 *
 * @doc http://doc.gameclosure.com/api/ui-widget-listview.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/widget/listview.md
 */

import squill.models.List as List;
import ui.ScrollView as ScrollView;
import event.input.InputEvent as InputEvent;

/**
 * @extends ui.ScrollView
 */
exports = Class(ScrollView, function (supr) {
	this.init = function (opts) {

		this._scrollBuffer = opts.scrollBuffer;

		opts.scrollBounds = {
			minX: 0,
			minY: 0,
			maxX: Number.MAX_VALUE,
			maxY: Number.MAX_VALUE
		};

		this.model = new List({view: this});
		supr(this, 'init', [opts]);
	};

	this.tag = 'ListView';

	var FORWARD_KEYS = {
			getCell: 1, sorter: 1, selectable: 1, selections: 1,
			maxSelections: 1, dataSource: 1, recycle: 1, renderMargin: 1,
			isFixedSize: 1, isTiled: 1, margin: 1
		};

	this.updateOpts = function () {
		var opts = supr(this, 'updateOpts', arguments);

		var listOpts = {view: this};
		for (var key in FORWARD_KEYS) {
			if (key in opts) {
				listOpts[key] = opts[key];
			}
		}

		if ('autoSize' in opts) {
			this._autoSize = opts.autoSize;
		}

		this.model.updateOpts(listOpts);
		this.selection = this.model.selection;
		if (this._onSelect) {
			this.model.subscribe('Select', this, this._onSelect);
		}
		if (this._onDeselect) {
			this.model.subscribe('Deselect', this, this._onDeselect);
		}

		// make sure the height is not undefined for compatibility with the layouts
		if (this._autoSize && !this.style.height) { this.style.height = 0; }

		this._needsModelRender = true;

		if (listOpts.isFixedSize) {
			this.subscribe('Scrolled', this, '_onScroll');
		} else {
			this.unsubscribe('Scrolled', this, '_onScroll');
		}

		var bounds = this._scrollBounds;
		var scrollBuffer = opts.scrollBuffer;
		bounds.minX = (scrollBuffer && scrollBuffer.minX || 0);
		bounds.maxX = (scrollBuffer && scrollBuffer.maxX || 0);
		bounds.minY = (scrollBuffer && scrollBuffer.minY || 0);

		return opts;
	};

	this.positionCell = function (cell, pos) {
		if (this._headerView) {
			pos.y += this._headerView.style.height;
		}

		cell.style.update(pos);
	}

	// This function returns a DataSource
	this.getSelections = function () {
		return this.model.getSelections();
	};

	// This function returns an object the keys are the selected items
	this.getSelection = function () {
		return this.model.selection.get();
	};

	this.getSelectionCount = function () {
		return this.model.getSelectionCount();
	};

	this.deselectAll = function () {
		this.model.deselectAll();
	};

	this._onScroll = function () {
		this._needsModelRender = true;
		this.needsRepaint();
	};

	this.reflow = function () {
		this._needsModelRender = true;
	};

	// This method is for internal use only!
	this.addCell = function (cellView) {
		cellView.style.visible = true;
		this.addSubview(cellView);
		this.needsRepaint(true);
	};

	this.setHeaderView = function (headerView) {
		if (this._headerView) {
			this._headerView.removeFromSuperview();
		}

		this._headerView = headerView;
		if (this._headerView) {
			this.addSubview(headerView);
			headerView.style.y = 0;

			// all views need to shift down
			this.reflow();

			// update the scroll bounds to account for the footer
			this.setMaxY();
		}
	}

	this.setFooterView = function (footerView) {
		if (this._footerView) {
			this._footerView.removeFromSuperview();
		}

		this._footerView = footerView;
		if (this._footerView) {
			this.addSubview(footerView);

			// update the scroll bounds to account for the footer
			this.setMaxY();
		}
	}

	this.setMaxX = function (maxX) {

		if (this._autoSize && this.style.width != maxX) {
			this.style.width = maxX;
			this._needsModelRender = true;
		}

		// TODO: stop publishing WidthChanged when we move to timestep ui
		// because this is done by ScrollView

		var bounds = this._scrollBounds;
		var oldMaxX = bounds.maxX;
		var newMaxX = Math.max(0, maxX);

		bounds.minX = bounds.maxX = 0;
		bounds.minX = 0;
		bounds.maxX = newMaxX;

		var scrollBuffer = this._opts.scrollBuffer;
		if (scrollBuffer) {
			bounds.minX += scrollBuffer.minX;
			bounds.maxX += scrollBuffer.maxX;
		}

		if (oldMaxX != newMaxX) {
			this.publish("WidthChanged", maxX);
		}
	};

	this.setMaxY = function (contentHeight) {

		if (!contentHeight) { contentHeight = 0; }

		var additionalHeight = 0;
		if (this._headerView) {
			additionalHeight += this._headerView.style.height || 0;
		}

		if (this._footerView) {
			this._footerView.style.y = contentHeight + additionalHeight;
			additionalHeight += this._footerView.style.height || 0;
		}

		this._contentHeight = contentHeight;
		var maxY = contentHeight + additionalHeight;

		if (this._autoSize && this.style.height != maxY) {

			this.style.height = maxY;
			this._needsModelRender = true;
		}

		// TODO: stop publishing HeightChanged when we move to timestep ui
		// because this is done by ScrollView

		var scrollBuffer = this._opts.scrollBuffer;

		var oldMaxY = this._scrollBounds.maxY;
		var newMaxY = Math.max(0, maxY) + (scrollBuffer && scrollBuffer.maxY || 0);
		this.setScrollBounds({maxY: newMaxY});

		if (oldMaxY != newMaxY) {
			this.publish("HeightChanged", maxY);
		}
	};

	this.render = function (ctx, opts) {
		var viewportChanged = supr(this, 'render', arguments);

		if (viewportChanged || this._needsModelRender || this.model._needsSort) {
			this._needsModelRender = false;
			this.model.render(opts.viewport);
		}
	};
});

