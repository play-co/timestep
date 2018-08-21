let exports = {};

import {
  merge,
  bind
} from 'base';

import Widget from './Widget';
import DataSource from 'squill/models/DataSource';

import browser from 'util/browser';
let $ = browser.$;

exports = class extends Widget {
  constructor (opts) {
    opts = merge(opts, { renderer: bind(this, 'defaultRenderer') });

    this._items = {};
    if (opts.dataSource) {
      this.setDataSource(opts.dataSource);
    }
    super(...arguments);
  }
  buildWidget () {
    if (this._opts.name) {
      this.setName(this._opts.name);
    }

    if (!this._dataSource) {
      this.setDataSource(new DataSource());
    }

    if (this._opts.items) {
      var uid = 1;
      var items = this._opts.items.map(function (item) {
        if (typeof item != 'object') {
          return {
            id: typeof item == 'string' ? item : uid++,
            value: item
          };
        } else {
          if (!item.id) {
            item.id = 'value' in item ? item.value : 'title' in item ?
              item.title : uid++;
          }

          return item;
        }
      });

      this._dataSource.add(items);
    }

    if ('value' in this._opts) {
      this.setValue(this._opts.value);
    }

    this.initMouseEvents(this._el);
    $.onEvent(this._select, 'change', this, '_onSelect');
  }
  _onSelect () {
    var item = this._dataSource.get(this.getValue());
    if (item) {
      this.publish('change', item);
    }
  }
  getDataSource () {
    return this._dataSource;
  }
  setDataSource (dataSource) {
    if (this._dataSource) {
      this._dataSource.unsubscribe('Update', this);
      this._dataSource.unsubscribe('Remove', this);
    }
    this._dataSource = dataSource;
    this._dataSource.subscribe('Update', this, 'onUpdateItem');
    this._dataSource.subscribe('Remove', this, 'onRemoveItem');
    this._dataSource.forEach(function (item, key) {
      this.onUpdateItem(key, item);
    }, this);
  }
  defaultRenderer (item) {
    var key = this._dataSource.getKey();
    return item.displayName || item.label || item.title || item.text ||
      item[key];
  }
  onUpdateItem (id, item) {
    var el = this._items[id];
    var keyField = this._dataSource.getKey();

    if (typeof item === 'string') {
      var o = {};
      o[keyField] = item;
      item = o;
    }

    if (!el) {
      var el = this._items[id] = $.create({ tag: 'option' });
      $.insertBefore(this._select, el);
    }

    el.setAttribute('value', item[keyField]);
    var renderer = this._opts.renderer;
    el.innerText = typeof renderer === 'string' ? item[renderer] : renderer(
      item);
    el.value = item[keyField];
  }
  onRemoveItem (id) {
    var el = this._items[id];
    var prevValue = this.getValue();
    if (el) {
      $.remove(el);
      delete this._items[id];
    }
    var newValue = this.getValue();
    if (newValue != prevValue) {
      this._onSelect();
    }
  }

  setName (name) {
    this._select.name = name;
  }
  setValue (value) {
    this._select.value = value;
  }
  getValue () {
    return this._select.value;
  }
};
exports.prototype._css = 'select';
exports.prototype._def = {
  tag: 'label',
  style: { display: 'inline-block' },
  children: [{
    id: '_select',
    tag: 'select'
  }]
};
var SelectBox = exports;

export default exports;
