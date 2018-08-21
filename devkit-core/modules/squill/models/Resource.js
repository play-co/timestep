let exports = {};

exports = class {
  constructor () {
    this._data = {};
  }
  get (key) {
    return this._data[key] && this._data[key].pop();
  }
  put (item, key) {
    (this._data[key] || (this._data[key] = [])).push(item);
  }
};

export default exports;
