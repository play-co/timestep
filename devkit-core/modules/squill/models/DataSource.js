let exports = {};

import {
  merge,
  isArray,
  logger
} from 'base';

import Callback from 'lib/Callback';
import BasicDataSource from './BasicDataSource';

var defaults = { key: 'id' };

var toStringSort = function () {
  return this._sortKey;
};

exports = class extends BasicDataSource {
  constructor (opts) {
    opts = merge(opts, defaults);
    super(opts);
    this._opts = opts;

    this._byIndex = [];
    this._byID = {};
    this._ctor = opts.ctor;
    this._reverse = opts.reverse;

    this.length = 0;

    this.onLoad = new Callback();

    this.setSorter(opts.sorter);
    this.setPersistence(opts.persistence);

    this._changeDataSave = false;
    this._changeData = {
      updated: [],
      updatedHash: {},
      removed: [],
      removedHash: {}
    };
  }
  setPersistence (persistence) {
    this._persistence = persistence;
    if (persistence) {
      this.onLoad.clear();
      persistence.load(this, this.onLoad.chain());
    }
  }
  _saveChanges (type, key) {
    if (this._changeDataSave && !this._changeData[type + 'Hash'][key]) {
      this._changeData[type + 'Hash'][key] = true;
      this._changeData[type].push(key);
    }
  }
  getFilteredDataSource (filterFn) {
    var ds = new DataSource(this._opts);
    this.forEach(function (item) {
      if (filterFn(item)) {
        ds.add(item);
      }
    });

    this.subscribe('Update', function (id, item) {
      if (filterFn(item)) {
        ds.add(item);
      } else {
        ds.remove(item);
      }
    });

    this.subscribe('Remove', function (id, item) {
      ds.remove(item);
    });
    return ds;
  }
  signalUpdate (type, item, id) {
    if (item[this.key] === undefined) {
      return;
    }
    switch (type) {
      case 'UPDATE':
        this._saveChanges('updated', item[this.key]);
        this.publish('Update', item[this.key], item);
        break;

      case 'REMOVE':
        this._saveChanges('removed', item[this.key]);
        this.publish('Remove', id, item);
        break;
    }
  }
  add (item) {
    if (isArray(item)) {
      var res = [];
      for (var i = 0, len = item.length; i < len; ++i) {
        if (item[i]) {
          var obj = this.add(item[i]);
          if (obj) {
            res.push(obj);
          }
        }
      }

      return res;
    } else {
      var id = item[this.key];

      // note: not the same as `if (!id) { ... }`
      if (id == null) {
        return;
      }

      var index = null;
      if (this._byID[id]) {
        for (var i = 0, _item; _item = this._byIndex[i]; ++i) {
          if (_item[this.key] == id) {
            if (typeof _item.update == 'function') {
              _item.update(item);
              item = _item;
            } else {
              index = i;
            }
            break;
          }
        }
      } else {
        index = this.length++;
      }

      // if we're adding it to the array:
      if (index !== null) {
        // make sure it's an instance of the specified class
        if (this._ctor && !(item instanceof this._ctor)) {
          item = new this._ctor(item);
        }

        this._byIndex[index] = item;
      }

      this._byID[id] = item;

      this.signalUpdate('UPDATE', item);

      if (this._sorter) {
        item._sortKey = this._sorter(item);
        item.toString = toStringSort;
      }
    }

    return item;
  }
  remove (id) {
    if (typeof id == 'object') {
      id = id[this.key];
    }
    if (id == null) {
      return;
    }

    if (this._byID[id]) {
      this.signalUpdate('REMOVE', this._byID[id], id);
      delete this._byID[id];
      for (var i = 0, item; item = this._byIndex[i]; ++i) {
        if (item[this.key] == id) {
          --this.length;
          return this._byIndex.splice(i, 1)[0];
        }
      }
    }
  }
  keepOnly (list) {
    this.compare(list, function (dataSource, local, remote) {
      if (!remote) {
        dataSource.remove(local);
      }
    });
  }
  clear () {
    var index = this._byIndex;

    this._byIndex = [];
    this._byID = {};
    this.length = 0;

    for (var i = 0, item; item = index[i]; ++i) {
      this.signalUpdate('REMOVE', item, item[this.key]);
    }
  }
  getCount () {
    return this.length;
  }
  setSorter (sorter) {
    this._sorter = sorter;
    if (sorter) {
      for (var i = 0, item; item = this._byIndex[i]; ++i) {
        item._sortKey = sorter(item);
        item.toString = toStringSort;
      }
    }
    this.sort();
    return this;
  }
  getIDs () {
    return this._byIndex.map(function (item) {
      return item[this.key];
    }, this);
  }
  contains (id) {
    return !!this._byID[id];
  }
  getKey () {
    return this.key;
  }
  getItemForID (id) {
    return this._byID[id] || null;
  }
  indexOf (item) {
    return this._byIndex.indexOf(item);
  }
  getItemForIndex (index) {
    return this._byIndex[index];
  }
  sort () {
    this._byIndex.sort();
    this._reverse && this._byIndex.reverse();
  }
  each (cb, context) {
    for (var i = 0; i < this.length; ++i) {
      if (cb.call(context, this._byIndex[i], i)) {
        return;
      }
    }
  }
  toJSON () {
    return {
      key: this.key,
      items: this._byIndex
    };
  }
  fromJSON (data) {
    this.clear();
    var key = this.key = data.key;
    this.add(data.items);
  }
  toArray () {
    return this._byIndex.slice(0);
  }
  beginChanges () {
    this._changeDataSave = true;
    this._changeData = {
      updated: [],
      updatedHash: {},
      removed: [],
      removedHash: {}
    };
  }
  saveChanges () {
    this._changeDataSave = false;
    if (this._persistence) {
      var changeData = this._changeData,
        i, j;

      this._persistence.remove(changeData.removed);

      if (changeData.updated.length) {
        var updateList = [];
        for (i = 0, j = changeData.updated.length; i < j; i++) {
          updateList.push(this._byID[changeData.updated[i]]);
        }
        this._persistence.update(updateList);
      }

      this._persistence.commit();
    }
  }
  load (cb) {
    if (this._persistence) {
      this._persistence.load(this, function (err) {
        if (err) {
          logger.log('error loading', JSON.stringify(err));
        }
        cb && cb(err);
      });
    }
  }
  save () {
    if (this._persistence) {
      this._persistence.save(this);
    }
  }
  compare (dict, cb) {
    var key = this.key;

    // create a key-indexed copy of dict to run the comparison against
    var compareTo = {};
    if (isArray(dict)) {
      for (var i = 0, n = dict.length; i < n; ++i) {
        compareTo[dict[i][key]] = dict[i];
      }
    } else {
      for (var k in dict) {
        compareTo[k] = dict[k];
      }
    }

    // first, compare all items in the index to the dict items
    var items = this._byIndex.slice(0);
    for (var i = 0, item; item = items[i]; ++i) {
      var k = item[key];
      cb.call(this, this, item, compareTo[k]);
      delete compareTo[k];
    }

    // then, for any remaining dict items, they don't exist in the local version
    for (var k in compareTo) {
      cb.call(this, this, null, compareTo[k]);
    }
  }
  filter (filter) {
    var result = new DataSource({ key: this.key });
    var key;
    var item;
    var match;
    var i;
    var j = this.length;

    result.key = this.key;
    for (i = 0; i < j; ++i) {
      item = this._byIndex[i];
      match = true;
      for (key in filter) {
        if (typeof item[key] == 'string' && item[key].toLowerCase().indexOf(
            filter[key]) == -1) {
          match = false;
        }
      }

      if (match) {
        result.add(item);
      }
    }

    return result;
  }
};
exports.prototype.updated = exports.prototype.add;
exports.prototype.get = exports.prototype.getItemForID;
exports.prototype.forEach = exports.prototype.each;
var DataSource = exports;

export default exports;
