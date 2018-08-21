let exports = {};

import { bind } from 'base';

import PubSub from 'lib/PubSub';

function pollHash () {
  try {
    var i = window.location.href.indexOf('#');
    var tag = i > 0 ? window.location.href.substring(i + 1).toLowerCase() : '';
    if (tag && tag !== this._lastTag) {
      this.publish('Change', tag, this._lastTag);
      this._lastTag = tag;
    }
  } catch (e) {}
}

class Poller extends PubSub {
  start (initial, frequency) {
    this._lastTag = initial;
    setInterval(bind(this, pollHash), frequency || 500);
    setTimeout(bind(this, pollHash), 0);
  }
  getPrev () {
    return this._lastTag;
  }
}

Poller.prototype._lastTag = null;
exports.Poller = new Poller();

exports.BasicPager = class {
  constructor (prefix) {
    this._prefix = prefix;
    exports.Poller.subscribe('Change', this, 'goto');
  }
  goto (page, lastPage) {
    lastPage = lastPage || exports.Poller.getPrev();

    window.location.hash = page;

    var prev = document.getElementById(this._prefix + lastPage);
    if (prev) {
      prev.style.display = 'none';
    }

    var next = document.getElementById(this._prefix + page);
    if (next) {
      next.style.display = 'block';
    }
  }
};

export default exports;
