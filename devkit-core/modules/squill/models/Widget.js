let exports = {};

import PubSub from 'lib/PubSub';

exports = class extends PubSub {
  constructor (opts) {
    super();

    this._opts = opts;
    this._view = opts.view;
  }
};

export default exports;
