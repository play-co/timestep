let exports = {};

import BasicPersistenceHandler from './BasicPersistenceHandler';

exports = class extends BasicPersistenceHandler {
  constructor (opts) {
    super(...arguments);

    this._storageKey = opts.storageKey;
  }
  load (dataSource, cb) {
    var dataStr = localStorage.getItem(this._storageKey);
    if (dataStr) {
      try {
        dataSource.fromJSON(JSON.parse(dataStr));
        return cb && cb();
      } catch (e) {
        return cb && cb({ 'InvalidJSON': 'local storage may be corrupted' });
      }
    } else {
      return cb && cb({ 'NoData': true });
    }
  }
  save (dataSource) {
    localStorage.setItem(this._storageKey, JSON.stringify(dataSource));
  }
};
var LocalPersistenceHandler = exports;

export default exports;
