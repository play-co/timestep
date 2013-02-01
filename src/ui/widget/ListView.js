/* @license
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

	this.updateOpts = function () {
		var opts = supr(this, 'updateOpts', arguments);

		var listOpts = {
			view: this,
			getCell: opts.getCell,
			sorter: opts.sorter,
			selectable: opts.selectable,
			maxSelections: opts.maxSelections,
			dataSource: opts.dataSource,
			renderMargin: opts.renderMargin
		};

		if ('recycle' in opts) {
			listOpts.recycle = opts.recycle;
		}

		if ('isFixedSize' in opts) {
			listOpts.isFixedSize = opts.isFixedSize;
		}

		if ('isTiled' in opts) {
			listOpts.isTiled = opts.isTiled;
		}

		this.model.updateOpts(listOpts);
		this.selection = this.model.selection;
		if (this._onSelect) {
			this.model.subscribe('Select', this, this._onSelect);
		}
		if (this._onDeselect){
			this.model.subscribe('Deselect', this, this._onDeselect);
		}

		this._autoSize = opts.autoSize;

		// make sure the height is not undefined for compatibility with the layouts
		if (this._autoSize && !this.style.height) { this.style.height = 0; }

		this._needsModelRender = true;

		if (listOpts.isFixedSize) {
			this.subscribe('Scrolled', this, '_onScroll');
		} else {
			this.unsubscribe('Scrolled', this, '_onScroll');
		}

		return opts;
	};

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

	this.setMaxY = function (maxY) {

		if (this._autoSize && this.style.height != maxY) {
			this.style.height = maxY;
			this._needsModelRender = true;
		}

		// TODO: stop publishing HeightChanged when we move to timestep ui
		// because this is done by ScrollView

		var bounds = this._scrollBounds;
		var oldMaxY = bounds.maxY;
		var newMaxY = Math.max(0, maxY);

		bounds.minX = bounds.maxX = 0;
		bounds.minY = 0;
		bounds.maxY = newMaxY;

		var scrollBuffer = this._opts.scrollBuffer;
		if (scrollBuffer) {
			bounds.minY += scrollBuffer.minY;
			bounds.maxY += scrollBuffer.maxY;
		}

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

