let exports = {};

import {
  bind,
  logger
} from 'base';

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
'use import';

import Callback from 'lib/Callback';

var REQUEST_ID = 0;

class chromeFrameClass {
  constructor () {
    this._callBacks = {};
    this._isChromeFrame = !!window.externalHost;
    if (this._isChromeFrame) {
      window.externalHost.onmessage = bind(this, function (event) {
        var data = JSON.parse(event.data);
        var requestID = data.requestID;
        var cb = this._callBacks[requestID];
        if (cb) {
          cb.apply(this, data.args);
          delete this._callBacks[requestID];
        }
      });
    }
  }
  send (destination, data, cb) {
    var id = ++REQUEST_ID;

    if (typeof cb == 'function') {
      this._callBacks[id] = cb;
    }

    window.externalHost.postMessage(JSON.stringify({
      destination: destination,
      data: data,
      requestID: id
    }), '*');
  }
  isChromeFrame () {
    return this._isChromeFrame;
  }
  _postMessage () {
    if (!this._isChromeFrame) {
      logger.log('Cannot post message to chrome frame, ');
      return;
    }
    return !!window.externalHost;
  }
}

/*
	this._receiveMessage = function (event) {
		data = JSON.parse(event.data);
		this._callBacks[data.requestID](data.data);
	};
	*/
// only export our chrome frame object if chrome frame exists in current context
exports = new chromeFrameClass();

export default exports;
