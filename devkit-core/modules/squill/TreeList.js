let exports = {};

import {
  merge,
  bind
} from 'base';

import browser from 'util/browser';
let $ = browser.$;

import Widget from './Widget';

var elementIDPrefix = 0;

var defaults = {
  key: 'id',
  label: 'title',
  wrapperId: 'browser',
  contentId: 'contentWrapper'
};

exports = class extends Widget {
  constructor (opts) {
    opts = opts || {};
    opts = merge(opts, defaults);

    this._initClasses(opts);

    this._key = opts.key;
    this._label = opts.label;
    this._wrapperId = opts.wrapperId;
    this._contentId = opts.contentId;
    this._leaveWidth = opts.leaveWidth || 600;

    elementIDPrefix++;
    this._elementIDPrefix = 'menuItem' + elementIDPrefix + '_';

    if (opts.dataSource) {
      this.setDataSource(opts.dataSource);
    } else {
      this._dataSource = null;
    }

    this._def = {
      id: this._wrapperId,
      className: 'browser',
      children: [{
        id: this._contentId,
        className: 'contentWrapper',
        children: []
      }]
    };

    this._root = null;
    this._itemByKey = {};

    super(...arguments);
  }
  _initClasses (opts) {
    this._classNames = {
      nodeWrapper: opts.nodeWrapper || 'browserNodeWrapper',
      nodeWrapperHidden: opts.nodeWrapperHidden ||
        'browserNodeWrapperHidden',
      node: opts.node || 'browserNode',
      nodeChildren: opts.nodeChildren || 'children',
      // Node has children...
      nodeActive: opts.nodeActive || 'active',
      // Selected node...
      nodeActiveChild: opts.nodeActiveChild || 'browserNodeActiveChild'
    };
  }
  _clearItem (item) {
    var parent, children, i, j;

    if (item.children) {
      children = item.children;
      while (children.length) {
        this._clearItem(children.pop());
      }
    }

    if (item.parent) {
      parent = item.parent;
      children = parent.children;
      for (i = 0, j = children.length; i < j; i++) {
        if (children[i] === item) {
          children.splice(i, 1);
          break;
        }
      }
      if (!children.length && parent.group) {
        $.remove(parent.group.parentNode);
        $.remove(parent.group);
        delete parent.group;
      }
    }

    $.remove(item.node);
    item.group && $.remove(item.group);
  }
  _createMenuId (inc) {
    var menuId = this._menuId;
    if (inc) {
      this._menuId++;
    }
    return this._elementIDPrefix + menuId;
  }
  _createGroup (visible) {
    var menuId = this._createMenuId(true),
      node = $({
        parent: $({
          parent: $.id(this._contentId),
          id: menuId,
          className: visible ? this._classNames.nodeWrapper : this._classNames
            .nodeWrapperHidden
        }),
        className: this._classNames.node
      });

    node.menuId = menuId;
    return node;
  }
  _createItem (item, group) {
    var id = this._createMenuId(true);

    item.node = $({
      parent: group,
      id: id,
      tag: 'a',
      text: item[this._label]
    });
    $.onEvent(id, 'click', this, 'onClick', item);
  }
  buildWidget () {
    this._menuId = 0;
    this._menuById = [];
    this._menuStack = [];
    this._menuActiveItem = false;

    if (this._dataSource !== null) {
      this._dataSource.each(bind(this, this.onCreateItem));
    }
  }
  _removeFromStack (depth) {
    var menuStack = this._menuStack,
      info = null;

    while (menuStack.length && menuStack[menuStack.length - 1].depth >=
      depth) {
      info = menuStack.pop();

      $.removeClass(info.node.id, this._classNames.nodeActive);
      $.removeClass(info.node.id, this._classNames.nodeActiveChild);

      if (info.group) {
        $.addClass(info.group.menuId, this._classNames.nodeWrapperHidden);
        $.removeClass(info.group.menuId, this._classNames.nodeWrapper);
      }
    }

    return info;
  }
  applyNodeStyle (item) {
    if (item.children && item.children.length) {
      $.addClass(item.node, this._classNames.nodeChildren);
    } else {
      $.removeClass(item.node, this._classNames.nodeChildren);
    }
    if (item === this._menuActiveItem) {
      $.addClass(item.node, this._classNames.nodeActive);
    } else {
      $.removeClass(item.node, this._classNames.nodeActive);
    }

    if (item.removeCustomClass !== undefined && item.removeCustomClass) {
      $.removeClass(item.node, item.removeCustomClass);
    }
    if (item.customClass !== undefined && item.customClass) {
      $.removeClass(item.node, item.customClass);
      $.addClass(item.node, item.customClass);
    }
  }
  _addToStack (item) {
    this._menuStack.push(item);
    this.applyNodeStyle(item);

    if (item.children && item.children.length) {
      if (!item.group) {
        var child, i, j;

        item.children.sort();

        item.group = this._createGroup(true);
        for (i = 0, j = item.children.length; i < j; i++) {
          child = item.children[i];
          this._createItem(child, item.group);

          // DisplayItem might change the styling of the element!
          this.publish('DisplayItem', child.data, child);
          this.applyNodeStyle(child);
        }
      }
      $.addClass(item.group.menuId, this._classNames.nodeWrapper);
      $.removeClass(item.group.menuId, this._classNames.nodeWrapperHidden);
    }
  }
  onClick (item) {
    var menuStack = this._menuStack;
    var lastItem = null;
    var id;
    var i;

    this.publish('SelectItem', item.data, item);

    if (this._menuActiveItem) {
      lastItem = this._menuActiveItem;
      this._menuActiveItem = null;
      this.applyNodeStyle(lastItem);
      lastItem = null;
    }

    if (menuStack.length && item.depth <= menuStack[menuStack.length - 1].depth) {
      lastItem = this._removeFromStack(item.depth);
    }
    if (lastItem !== item) {
      this._addToStack(item);
    }

    this._menuActiveItem = item;
    this.applyNodeStyle(item);

    if (menuStack.length) {
      i = menuStack.length;
      if (menuStack[menuStack.length - 1].children && menuStack[menuStack.length -
          1].children.length) {
        i++;
      }
      $.id(this._contentId).style.width = i * 200 + this._leaveWidth + 'px';
    }
  }
  onUpdateItem (item, key) {
    var treeItem = {
        title: item[this._label],
        toString: function () {
          return this.title;
        }
      },
      parentItem, children, child, i, j;

    if (this._itemByKey[key]) {
      if (this._itemByKey[key].node) {
        this._itemByKey[key].node.innerHTML = item[this._label];
      }
      return;
    }

    if (item.parent === null || item.parent === -1) {
      if (this._root === null) {
        this._rootGroup = this._createGroup(true);
        this._createItem(treeItem, this._rootGroup);
        this._root = treeItem;

        treeItem.data = item;
        treeItem.depth = 0;
        treeItem.parent = null;

        // DisplayItem might change the styling of the element!
        this.publish('DisplayItem', treeItem.data, treeItem);
        this.applyNodeStyle(treeItem);
      }
    } else {
      parentItem = this._itemByKey[item.parent[this._key]];
      if (parentItem) {
        if (!parentItem.children) {
          parentItem.children = [];
        }
        children = parentItem.children;

        if (this._menuActiveItem && (this._menuActiveItem === parentItem ||
            this._menuActiveItem.parent === parentItem)) {
          for (i = 0, j = children.length; i < j; i++) {
            if (children[i].node) {
              $.remove(children[i].node);
              children[i].node = null;
            }
          }
          children.push(treeItem);
          children.sort();

          if (!parentItem.group) {
            parentItem.group = this._createGroup(true);
            $.id(this._contentId).style.width = (this._menuStack.length + 1) *
              200 + 500 + 'px';
          }
          for (i = 0, j = children.length; i < j; i++) {
            child = children[i];
            this._createItem(child, parentItem.group);

            // DisplayItem might change the styling of the element!
            this.publish('DisplayItem', child.data, child);
            this.applyNodeStyle(child);
          }
        } else {
          children.push(treeItem);
        }
      }
      treeItem.depth = parentItem.depth + 1;
      treeItem.parent = parentItem;
    }

    treeItem.data = item;
    this._itemByKey[key] = treeItem;
  }
  onCreateItem (item) {
    this.onUpdateItem(item, item[this._key]);
  }
  onRemoveItem (item, key) {
    var treeItem = this._itemByKey[key];
    var lastChild;
    var treeParent;

    if (treeItem) {
      lastChild = treeItem.parent.children.length <= 1;
      treeParent = item[this._dataSource.parentKey];

      this._removeFromStack(this._itemByKey[key].depth - 1);
      this._clearItem(this._itemByKey[key]);
      this._menuActiveItem = false;

      delete this._itemByKey[key];
      this.publish('UnSelectItem');

      if (lastChild && treeParent) {
        treeItem = this._itemByKey[treeParent[this._dataSource.key]];
        this.publish('DisplayItem', treeItem.data, treeItem);
        this.applyNodeStyle(treeItem);
      }
    }
  }
  showItem (item) {
    var treeItem = this.getTreeNode(item);
    this.publish('DisplayItem', item, treeItem);
    this.applyNodeStyle(treeItem);
  }
  setDataSource (dataSource) {
    this._dataSource = dataSource;
    this._dataSource.subscribe('Update', this, this.onUpdateItem);
    this._dataSource.subscribe('Remove', this, this.onRemoveItem);
  }
  getPathString (separator) {
    var result = '',
      menuStack = this._menuStack,
      i, j;

    separator = separator || ' ';
    for (i = 0, j = menuStack.length; i < j; i++) {
      if (result !== '') {
        result += separator;
      }
      result += menuStack[i].data[this._label];
    }

    return result;
  }
  getTreeNode (item) {
    return this._itemByKey[item[this._dataSource.key]];
  }
};
var TreeList = exports;

export default exports;
