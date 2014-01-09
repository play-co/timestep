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
 * @package ui.widget.CellView;
 *
 * @doc http://doc.gameclosure.com/api/ui-widget-listview.html#class-ui.widget.cellview
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/widget/listview.md
 */

import ui.View as View;
import squill.models.Cell;
/**  	
 * @extends ui.View	
 */
exports = Class(View, function (supr) {
	this.init = function (opts) {
		opts = merge(opts, {
			layout: 'box'
		});
		supr(this, 'init', [opts]);
		this.model = new squill.models.Cell({
			view: this
		});
	};

	this.tag = 'CellView';
	this.remove = function (list) {
		if (!list.isRecycleEnabled) {
			this.removeFromSuperview();
		} else {
			this.style.visible = false;
		}
	};

	this.isSelected = function () {
		return this.controller.isSelected && this._data && this.controller.isSelected(this._data);
	};

	this.select = function () {
		this.controller.select && this.controller.select(this._data);
	};

	this.deselect = function () {
		this.controller.deselect && this.controller.deselect(this._data);
	};

	this.getHeight = function () { return this.style.height; }
	this.getWidth = function () { return this.style.width; }
	this.setData = function (data) { this._data = data; }

	this.setController = function (controller) {
		this.controller = controller;
		if (this._onSelect) {
			this._selectCB = this._selectCB || function (data) {
					(data === this._data) && this._onSelect();
				};
			this.controller.unsubscribe('Select', this, this._selectCB);
			this.controller.subscribe('Select', this, this._selectCB);
		}
		if (this._onDeselect) {
			this._deselectCB = this._deselectCB || function (data) {
					(data === this._data) && this._onDeselect();
				};
			this.controller.unsubscribe('Deselect', this, this._deselectCB);
			this.controller.subscribe('Deselect', this, this._deselectCB);
		}
	};

	this.onClick = this.onInputSelect = function () {
		if (!this.controller || !this.controller.selection) { return; }

		var type = this.controller.selection.getType();
		if (type == 'toggle' || type == 'multi') {
			if (this.isSelected()) {
				this.deselect();
			} else {
				this.select();
			}
		} else if (type == 'single') {
			this.select();
		}
	};
});
