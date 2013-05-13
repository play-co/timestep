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
	this.setPosition = function (pos) { this.style.update(pos); }

	this.setController = function (controller) {
		this.controller = controller;
		if (this._onSelect) {
			this.controller.subscribe(
				'Select',
				this,
				function (data) {
					(data === this._data) && this._onSelect();
				}
			);
		}
		if (this._onDeselect) {
			this.controller.subscribe(
				'Deselect',
				this,
				function (data) {
					(data === this._data) && this._onDeselect();
				}
			);
		}
	};

	this.render = function (ctx) {};

	this.onClick = this.onInputSelect = function () {
		if (!this.controller.selection) { return; }

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
