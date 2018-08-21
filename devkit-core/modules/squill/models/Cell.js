let exports = {};

import Widget from './Widget';

exports = class extends Widget {
  constructor (params) {
    super(...arguments);
  }
  setRecycleID (id) {
    this._recycleID = id;
  }
  setResource (resource) {
    this._resource = resource;
  }
  recycle () {
    this.publish('Recycle');
    if (this._resource) {
      this._resource.put(this._view, this._recycleID);
    }
  }
};
var Cell = exports;

export default exports;
