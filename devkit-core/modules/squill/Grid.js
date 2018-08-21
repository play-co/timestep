let exports = {};

import Widget from './Widget';

exports = class extends Widget {
  getContainer () {
    return this.contents;
  }
  buildChildren (children) {
    if (Array.isArray(children[0])) {
      var args = Array.prototype.slice.call(arguments);
      var gridChildren = args[0] = [];
      for (var i = 0, n = children.length; i < n; ++i) {
        var rows = children[i];
        var numRows = rows.length;
        gridChildren[i] = {
          tag: 'tr',
          children: []
        };
        for (var j = 0; j < numRows; ++j) {
          gridChildren[i].children[j] = {
            tag: 'td',
            children: rows[j]
          };
        }
      }
      return super.buildChildren(...args);
    } else {
      return super.buildChildren(...arguments);
    }
  }
};

exports.prototype._def = {
  children: [{
    id: 'contents',
    tag: 'table',
    style: { borderSpacing: 0 }
  }]
};
export default exports;
