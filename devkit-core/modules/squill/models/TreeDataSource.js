let exports = {};

import {
  merge,
  isArray,
  bind
} from 'base';

import BasicDataSource from './BasicDataSource';

class TreeDataSourceNode {
  constructor (opts) {
    this.key = opts.key;
    this.parentKey = opts.parentKey;

    this._data = opts.data;
    this._dataContainer = {};
    this._children = [];
    this._parent = opts.parent;
    this._signalUpdate = opts.signalUpdate;

    var dataContainer = this._dataContainer;
    var signalUpdate = opts.signalUpdate;
    var data = opts.data;
    var key = opts.key;
    var f;

    for (f in data) {
      if (data.hasOwnProperty(f) && f !== key && f[0] !== '_') {
        this._dataContainer['_' + f] = data[f];
        data.__defineSetter__(f, this._createSetter(dataContainer, f,
          signalUpdate)());
        data.__defineGetter__(f, this._createGetter(dataContainer, f)());
      }
    }
  }
  _createSetter (dataContainer, field, signalUpdate) {
    return function () {
      return function (value) {
        dataContainer['_' + field] = value;
        signalUpdate('UPDATE_NODE', this);
      };
    };
  }
  _createGetter (dataContainer, field) {
    return function () {
      return function () {
        return dataContainer['_' + field];
      };
    };
  }
  clear () {
    var children = this._children,
      child, data, i;

    this._signalUpdate('REMOVE', this._data);

    while (children.length) {
      child = children.pop();
      data = child.getData();
      child.clear();
    }
  }
  removeChild (node) {
    var children = this._children;
    var i, j;

    for (i = 0, j = children.length; i < j; i++) {
      child = children[i];
      if (child === node) {
        child.clear();
        children.splice(i, 1);
        return true;
      }
    }

    return false;
  }
  remove () {
    return this._parent && this._parent.removeChild(this);
  }
  addChild (node) {
    this._children.push(node);
  }
  callback (cb) {
    var children = this._children;
    var i, j;

    cb(this._data);
    for (i = 0, j = children.length; i < j; i++) {
      children[i].callback(cb);
    }
  }
  sort () {
    var children = this._children;
    var i, j;

    children.sort();
    for (i = 0, j = children.length; i < j; i++) {
      children[i].sort();
    }
  }
  getData () {
    return this._data;
  }
  setData (data) {
    this._data = data;
  }
  getParent () {
    return this._parent;
  }
  getChildren () {
    return this._children;
  }
  toJSONData (list, singleItem) {
    list = list || [];

    var children = this._children,
      node = {},
      data = this._data,
      i, j;

    for (i in data) {
      if (data.hasOwnProperty(i)) {
        if (i === this.parentKey) {
          if (data[i] === null) {
            node[i] = null;
          } else {
            node[i] = this._parent.getData()[this.key];
          }
        } else {
          node[i] = data[i];
        }
      }
    }

    if (singleItem) {
      return node;
    } else {
      list.push(node);

      for (i = 0, j = children.length; i < j; i++) {
        children[i].toJSONData(list, false);
      }
    }

    return list;
  }
  toJSON () {
    return this.toJSONData([], false);
  }
}

var defaults = {
  key: 'id',
  parentKey: 'parent'
};

var toStringSort = function () {
  return this._sortKey;
};

exports = class extends BasicDataSource {
  constructor (opts) {
    opts = opts || {};
    opts = merge(opts, defaults);

    this._maxKey = 0;
    this.parentKey = opts.parentKey;

    this._nodeByKey = {};
    this._root = null;

    super(opts);
  }
  _saveChanges (type, key) {
    if (this._changeDataSave && !this._changeData[type + 'Hash'][key]) {
      this._changeData[type + 'Hash'][key] = true;
      this._changeData[type].push(key);
    }
  }
  signalUpdate (type, node) {
    var key = this.key,
      keyValue = node[key],
      channel = this._channel,
      data;

    switch (type) {
      case 'UPDATE_NODE':
      // This is a hack, this._nodeByKey[node[key]]._data should be equal to node but isn't...
        this._nodeByKey[node[key]].setData(node);

      case 'UPDATE':
        this._saveChanges('updated', keyValue);
        this.publish('Update', node, keyValue);
        break;

      case 'REMOVE':
        this._saveChanges('removed', keyValue);
        this.publish('Remove', node, keyValue);
        delete this._nodeByKey[keyValue];
        break;
    }
  }
  add (node) {
    var parent = node[this.parentKey] || null,
      internalParent, internalNode, key, i;

    if (isArray(node)) {
      for (i = 0, j = node.length; i < j; i++) {
        node[i] && this.add(node[i]);
      }
    } else {
      key = this.key;

      if (!node[key]) {
        node[key] = this._maxKey + 1;
      } else if (this._nodeByKey[node[key]]) {}

      if (!isNaN(parseInt(node[key], 10))) {
        this._maxKey = Math.max(this._maxKey, parseInt(node[key], 10));
      }

      internalParent = parent ? this._nodeByKey[parent[key]] : null;
      internalNode = new TreeDataSourceNode({
        key: this.key,
        parentKey: this.parentKey,
        parent: internalParent,
        data: node,
        signalUpdate: bind(this, this.signalUpdate)
      });

      this._nodeByKey[node[key]] = internalNode;

      if (internalParent) {
        internalParent.addChild(internalNode);
        this.signalUpdate('UPDATE', internalParent.getData());
      } else {
        this._root = internalNode;
      }

      this.signalUpdate('UPDATE', internalNode.getData());

      if (this._sorter) {
        internalNode._sortKey = this._sorter(internalNode.getData());
        internalNode.toString = toStringSort;
      }
    }

    return node;
  }
  remove (node) {
    var key = node[this.key],
      internalNode = this._nodeByKey[key];

    if (internalNode) {
      internalNode.remove();
    }

    return this;
  }
  clear () {
    this._maxKey = -1;
    if (this._root !== null) {
      this._root.clear();
      this._root = null;
    }
  }
  getRoot () {
    return this._root;
  }
  toJSON () {
    var result = {
      key: this.key,
      parentKey: this.parentKey,
      items: this._root ? this._root.toJSON() : []
    };

    return result;
  }
  fromJSON (data) {
    this.key = data.key;
    this.parentKey = data.parentKey;

    var parentKey = this.parentKey,
      items = data.items,
      item, i, j;

    var toString = function () {
      return !this[parentKey] ? '00000000' : 10000000 + this[parentKey];
    }

    ;

    for (i = 0, j = items.length; i < j; i++) {
      item = items[i];
      item.toString = toString;
      if (item[parentKey] === null || item[parentKey] === -1) {
        item[parentKey] = null;
      }
    }

    for (i = 0, j = items.length; i < j; i++) {
      item = items[i];
      if (item) {
        item[parentKey] = this._nodeByKey[item[parentKey]] ? this._nodeByKey[
          item[parentKey]].getData() : null;
        this.add(item);
      }
    }
  }
  each (cb) {
    this._root && this._root.callback(cb);
  }
  genKey () {
    this._maxKey + 1;
    return this._maxKey;
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
          updateList.push(this._nodeByKey[changeData.updated[i]].toJSONData(
            false, true));
        }
        this._persistence.update(updateList);
      }

      this._persistence.commit();
    }
  }
  setSorter (sorter) {
    this._sorter = sorter;
  }
  getByKey (id) {
    return this._nodeByKey[id] || null;
  }
  sort () {
    if (this._root) {
      this._root.sort();
    }
  }
  load (onLoad) {
    if (this._persistence) {
      this.clear();

      this._persistence.load(bind(this, function (data) {
        this.fromJSON({
          key: data.key,
          parentKey: this.parentKey,
          items: data.items
        });
        onLoad && onLoad();
      }), bind(this, this._reportError));
    }
  }
  _reportError (message) {
    this.publish('Error', message);
  }
};
var TreeDataSource = exports;

export default exports;
