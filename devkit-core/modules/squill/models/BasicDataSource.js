let exports = {};

import PubSub from 'lib/PubSub';

exports = class extends PubSub {
  constructor (opts) {
    super(...arguments);

    this.key = this._key = opts.key;
    this._channel = opts.channel;
    this._hasRemote = opts.hasRemote;
  }
  getKey () {
    return this._key;
  }
};
var BasicDataSource = exports;

export default exports;
