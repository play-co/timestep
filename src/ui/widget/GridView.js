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

import ui.View as View;

/**
 * @class ui.widget.GridView
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/widget/gridview.md
 */
exports = GridView = Class(View, function (supr) {
	this.init = function (opts) {
		opts = merge(opts, {
			horizontalMargin: 0,
			verticalMargin: 0,
			horizontalGutter: 0,
			verticalGutter: 0,
			autoCellSize: true
		});

		supr(this, "init", [opts]);

		this._rows = Math.max(opts.rows || 3, 1);
		this._cols = Math.max(opts.cols || 3, 1);

		this._lastWidth = null;
		this._lastHeight = null;

		this._colInfo = [];
		this._rowInfo = [];
	};

	this.updateOpts = function (opts) {
		if (("horizontalMargin" in opts) || ("verticalMargin" in opts)) {
			this.needsReflow();
		} else if (("horizontalGutter" in opts) || ("verticalGutter" in opts)) {
			this._lastWidth = null;
			this._lastHeight = null;
			this.needsReflow();
		}

		supr(this, "updateOpts", [opts]);
	};

	// Make a list of cell sizes, rounding errors can lead to cells
	// having a slightly different size which is why they are stored...
	this._getInfo = function (list, count, totalSize, gutterSize) {
		var globalScale = this.getPosition().scale;
		var size = ((totalSize + gutterSize) / count) | 0;

		var balance = 0;
		var sizeSum = 0;

		for (var i = 0; i < count; i++) {
			var item = list[i];
			if (!item) {
				item = {};
				list[i] = item;
			}
			var idealSize = size + balance;
			var roundedSize = Math.round(globalScale * size) / globalScale;
			balance = idealSize - roundedSize;
			item.size = size;
			sizeSum += size;
		}
		list[count >> 1].size += (totalSize - sizeSum);

		var pos = 0;
		var start = 0;
		for (var i = 0; i < count; i++) {
			var item = list[i];
			item.pos = pos;
			pos += item.size;
			start = gutterSize;
			item.size -= start;
		}
	};

	this._resize = function () {
		var width =  this.style.width;
		var height = this.style.height;

		this._lastWidth = width;
		this._lastHeight = height;

		this._getInfo(this._colInfo, this._cols, width, this._opts.horizontalGutter);
		this._getInfo(this._rowInfo, this._rows, height, this._opts.verticalGutter);
	};

	// Define getters and setters in a subview of GridView, when the col, row, colspan or rowspan
	// of the subview changes its location is calculated based on the GridView grid...
	this._createGetSet = function (subview, opts, property) {
		var privateProperty = "_" + property;
		opts[privateProperty] = opts[property];
		opts.__defineSetter__(property, bind(this, function (c) {
			if (opts[privateProperty] !== c) {
				opts[privateProperty] = c;
				this._updateSubview(subview);
			}
		}));

		opts.__defineGetter__(property, function () {
			return opts[privateProperty];
		});
	};

	this._checkSubview = function (subview, opts) {
		if (!("row" in opts) || !("col" in opts)) {
			return false;
		}
		if ("_row" in opts) { // If this private property exists then the getters and setters are there...
			return true;
		}

		opts.colspan = opts.colspan || 1;
		opts.rowspan = opts.rowspan || 1;

		this._createGetSet(subview, opts, "col");
		this._createGetSet(subview, opts, "row");
		this._createGetSet(subview, opts, "colspan");
		this._createGetSet(subview, opts, "rowspan");

		return true;
	};

	this._updateSubview = function (subview) {
		var opts = this._opts;
		var subviewOpts = subview._opts;
		var row = subviewOpts.row;
		var col = subviewOpts.col;

		// Check is the range is valid...
		if ((row < 0) || (row >= this._rows) || (col < 0) || (col >= this._cols)) {
			if (opts.hideOutOfRange) {
				subview.style.visible = false;
			}
			return;
		} else if (opts.showInRange) {
			subview.style.visible = true;
		}

		var style = subview.style;
		var horizontalMargin = isArray(opts.horizontalMargin) ? opts.horizontalMargin : [opts.horizontalMargin, opts.horizontalMargin];
		var verticalMargin = isArray(opts.verticalMargin) ? opts.verticalMargin : [opts.verticalMargin, opts.verticalMargin];

		style.x = this._colInfo[col].pos + horizontalMargin[0];
		style.y = this._rowInfo[row].pos + verticalMargin[0];

		if (!opts.autoCellSize) {
			return;
		}

		// Calculate the width based on the stored column sizes...
		var item = this._colInfo[Math.max(Math.min(col + subviewOpts.colspan - 1, this._cols - 1), 0)];
		style.width = item.pos + item.size - this._colInfo[col].pos - horizontalMargin[0] - horizontalMargin[1];

		// Calculate the height based on the stored row sizes...
		var item = this._rowInfo[Math.max(Math.min(row + subviewOpts.rowspan - 1, this._rows - 1), 0)];
		style.height = item.pos + item.size - this._rowInfo[row].pos - verticalMargin[0] - verticalMargin[1];
	};

	this.reflow = function () {
		((this.style.width !== this._lastWidth) || (this.style.height !== this._lastHeight)) && this._resize();

		var subviews = this._subviews;
		var i = subviews.length;

		while (i) {
			var subview = subviews[--i];
			this._checkSubview(subview, subview._opts) && this._updateSubview(subview);
		}
	};

	this.getCols = function () {
		return this._cols;
	};

	this.setCols = function (cols) {
		if (this._cols !== cols) {
			this._cols = Math.max(cols || 3, 1);
			this._lastWidth = null; // Forces the cell info to be re-calculated...
			this.needsReflow();
		}
	};

	this.getRows = function () {
		return this._rows;
	};

	this.setRows = function (rows) {
		if (this._rows !== rows) {
			this._rows = Math.max(rows || 3, 1);
			this._lastHeight = null; // Forces the cell info to be re-calculated...
			this.needsReflow();
		}
	};
});
