let exports = {};

/**
 * A remark about the implementation of this persistence handler:
 *
 * All data which is initially loaded here is kept and updated, which is
 * actually a duplicate function of the dataSource. This is done to make the
 * saving to the server as a single chunk of data easy. The commit sends all
 * data to the server.
 *
 * The final version should only send the updates to the server.
 **/
import {
  isArray,
  bind,
  merge
} from 'base';

import ajax from 'util/ajax';

import BasicPersistenceHandler from './BasicPersistenceHandler';

exports = class extends BasicPersistenceHandler {
  constructor (opts) {
    super(...arguments);

    this._loadURL = opts && opts.loadURL;
    this._saveURL = opts && opts.saveURL;
  }
  _checkChangeData () {
    if (!this._updateList) {
      this._updateList = [];
    }

    if (!this._removeList) {
      this._removeList = [];
    }
  }
  update (data) {
    var i, j;

    if (isArray(data)) {
      for (i = 0, j = data.length; i < j; i++) {
        this.update(data[i]);
      }
    } else {
      this._checkChangeData();
      this._updateList.push(data);

      this._data[data[this._key]] = data;
    }
  }
  remove (data) {
    var i, j;

    if (isArray(data)) {
      for (i = 0, j = data.length; i < j; i++) {
        this.remove(data[i]);
      }
    } else {
      this._checkChangeData();
      this._removeList.push(data);

      delete this._data[data];
    }
  }
  load (dataSource, cb) {
    if (this._loadURL === null) {
      cb && cb({ NoURL: 'Loading URL is not set.' });
      return;
    }

    ajax.post({
      url: this._loadURL,
      data: this._params
    }, bind(this, function (err, response) {
      var errorMessage = false,
        receivedData = {},
        data = [],
        i;

      if (err) {
        errorMessage = err;
      }

      if (!errorMessage) {
        try {
          receivedData = JSON.parse(response);
        } catch (e) {
          errorMessage =
            'Something went wrong decoding the JSON data.';
        }
      }

      if (receivedData.error !== false) {
        errorMessage =
          'The server reported a problem fetching the data: ' +
          receivedData.message;
      }
      if (!errorMessage && receivedData.data === undefined) {
        errorMessage = 'Data missing';
      }

      if (!errorMessage) {
        receivedData = receivedData.data;

        delete receivedData.update;
        delete receivedData.remove;

        for (i in receivedData) {
          if (receivedData.hasOwnProperty(i)) {
            data.push(receivedData[i]);
          }
        }
        // Keep the original...
        this._data = JSON.parse(response).data;
      }

      if (errorMessage) {
        cb && cb({ LoadingError: 'Loading error: ' + errorMessage });
      } else {
        dataSource.fromJSON({
          key: this._key,
          items: data
        });
        cb && cb();
      }
    }));
  }
  commit () {
    if (this._saveURL === null) {
      return;
    }

    var data = {},
      i, j;

    for (i in this._data) {
      if (this._data.hasOwnProperty(i) && this._data[i][this._key] !==
        undefined) {
        data[this._data[i][this._key]] = this._data[i];
      }
    }

    this._checkChangeData();

    data.remove = this._removeList;
    data.update = this._updateList;

    data = merge({ data: data }, this._params);

    ajax.post({
      url: this._saveURL,
      data: data
    }, bind(this, function (err, response) {
      this._removeList = [];
      this._updateList = [];
      this.publish('CommitFinished');
    }));
  }
  setLoadURL (loadURL) {
    this._loadURL = loadURL;
  }
  setSaveURL (saveURL) {
    this._saveURL = saveURL;
  }
};
var RemotePersistenceHandler = exports;

export default exports;
