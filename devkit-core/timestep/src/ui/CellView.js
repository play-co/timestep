
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
import { merge } from 'base';

import View from './View';
import Cell from 'squill/models/Cell';
/**
 * @extends ui.View
 */
export default class CellView extends View {
  constructor (opts) {
    opts = merge(opts, { layout: 'box' });
    super(opts);
    this.model = new Cell({ view: this });
  }
  remove (list) {
    if (!list.isRecycleEnabled) {
      this.removeFromSuperview();
    } else {
      this.style.visible = false;
    }
  }
  isSelected () {
    return this.controller.isSelected && this._data && this.controller.isSelected(
      this._data);
  }
  select () {
    this.controller.select && this.controller.select(this._data);
  }
  deselect () {
    this.controller.deselect && this.controller.deselect(this._data);
  }
  getHeight () {
    return this.style.height;
  }
  getWidth () {
    return this.style.width;
  }
  setData (data) {
    this._data = data;
  }
  setController (controller) {
    this.controller = controller;
    if (this._onSelect) {
      this._selectCB = this._selectCB || function (data) {
        data === this._data && this._onSelect();
      };
      this.controller.unsubscribe('Select', this, this._selectCB);
      this.controller.subscribe('Select', this, this._selectCB);
    }
    if (this._onDeselect) {
      this._deselectCB = this._deselectCB || function (data) {
        data === this._data && this._onDeselect();
      };
      this.controller.unsubscribe('Deselect', this, this._deselectCB);
      this.controller.subscribe('Deselect', this, this._deselectCB);
    }
  }
  onInputSelect () {
    if (!this.controller || !this.controller.selection) {
      return;
    }

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
  }
}

CellView.prototype.tag = 'CellView';
CellView.prototype.onClick = CellView.prototype.onInputSelect;
