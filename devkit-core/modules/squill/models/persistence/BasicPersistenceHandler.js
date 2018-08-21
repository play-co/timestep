let exports = {};

import { isArray } from 'base';

import PubSub from 'lib/PubSub';

exports = class extends PubSub {
  constructor (opts) {
    super(...arguments);

    this._params = opts.params || {};
    this._key = opts.key;
  }
  clear () {
    this._data = {};
  }
  load () {}
  commit () {}
  update (data) {
    var i, j;

    if (isArray(data)) {
      for (i = 0, j = data.length; i < j; i++) {
        this.update(data[i]);
      }
    } else {
      this._data[data[this._key]] = data;
    }
  }
  setSource (dataSource) {
    this._dataSource = dataSource;
  }
  remove (data) {
    var i, j;

    if (isArray(data)) {
      for (i = 0, j = data.length; i < j; i++) {
        delete this._data[data[i]];
      }
    } else {
      delete this._data[data];
    }
  }
  setParams (params) {
    this._params = params;
  }
};
var BasicPersistanceHandler = exports;

export default exports;
