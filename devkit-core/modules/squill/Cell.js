let exports = {};

import Widget from './Widget';
import DataItem from './models/DataItem';

import browser from 'util/browser';
let $ = browser.$;

exports = class extends Widget {
  constructor (opts) {
    super(...arguments);

    if (opts.item) {
      if (opts.item instanceof DataItem) {
        this.setItem(opts.item.data, opts.item);
      } else {
        this.setItem(opts.item);
      }
    }
  }
  buildWidget (el) {
    this.initMouseEvents();
  }
  isSelected () {
    return this._widgetParent.selection && this._widgetParent.selection.isSelected(
      this._item);
  }
  select () {
    this._widgetParent.selection && this._widgetParent.selection.select(
      this._item);
  }
  deselect () {
    this._widgetParent.selection && this._widgetParent.selection.deselect(
      this._item);
  }
  setItem (data, item) {
    this.setModel(data);
    this._data = data;
    this._item = item || data;
    this.updateSelected();
  }
  getData () {
    return this._data;
  }
  getItem () {
    return this._item;
  }
  render () {}
  onSelect () {
    if (!this._widgetParent.selection) {
      return;
    }

    var type = this._widgetParent.selection.getType();
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
  updateSelected () {
    var isSelected = this.isSelected();
    if (isSelected) {
      $.addClass(this._el, 'selected');
    } else {
      $.removeClass(this._el, 'selected');
    }
    return isSelected;
  }
};
exports.prototype._css = 'cell';
exports.prototype.onClick = exports.prototype.onSelect;
var Cell = exports;

exports.Selectable = exports;

export default exports;
