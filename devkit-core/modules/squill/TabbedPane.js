let exports = {};

import { merge } from 'base';

import browser from 'util/browser';
let $ = browser.$;
import Widget from './Widget';
import sort from 'lib/sort';

exports = class extends Widget {
  constructor (opts) {
    opts = opts || {};
    this._panes = [];

    super(...arguments);
  }
  buildWidget (el, result) {
    var opts = this._opts;

    this._container = this.tabContent;

    if (opts.tabChildren) {
      this.buildTabChildren(opts.tabChildren, result);
    }

    if (opts.panes) {
      this.buildPanes(opts.panes, result);
    }

    if (opts.paneClassName) {
      $.addClass(this._el, opts.paneClassName);
    }

    if (opts.containerWrapperClassName) {
      $.addClass(this.tabContainerWrapper, opts.containerWrapperClassName);
    }

    if (opts.contentsWrapperClassName) {
      $.addClass(this.tabContentsWrapper, opts.contentsWrapperClassName);
    }

    if (opts.tabContainerClassName) {
      $.addClass(this.tabContainer, opts.tabContainerClassName);
    }
  }
  buildTabChildren (tabChildren, results) {
    for (var i = 0, def; def = tabChildren[i]; ++i) {
      this.addTabWidget(def, results);
    }
  }
  getContainer () {
    return this._container || this._el;
  }
  addTabWidget (def, results) {
    return this.addWidget(def, this.tabContainer, results);
  }
  addWidget (def, parent, results) {
    var el = super.addWidget(...arguments);
    if (el instanceof exports.Pane) {
      this._addPane(el);
    }

    return el;
  }
  buildPanes (def, result) {
    def.forEach(function (opts) {
      this.newPane(opts, result);
    }, this);
  }
  newPane (def, res) {
    return this.addWidget(merge({ type: exports.Pane }, def, { tabPaneClassName: this
        ._opts.tabPaneClassName }), null, res);
  }
  _addPane (pane) {
    var title = pane.getTitle();
    if (title) {
      this._panes[title] = pane;
    }

    this._panes.push(pane);
    sort(this._panes, function (pane) {
      return pane._sortIndex;
    });
    this.tabContainer.appendChild(pane.tab);
    $.onEvent(pane.tab, 'mousedown', this, this.selectPane, pane);
    if (!this._selectedTab) {
      this.showPane(pane);
    } else {
      pane.hide();
    }

    return this;
  }
  clear () {
    this._panes.length = 0;
    this._selectedTab = null;
    this.tabContent.innerHTML = '';
    this.tabContainer.innerHTML = '';
  }
  getTabs () {
    return this._tabs;
  }
  getPanes () {
    return this._panes;
  }
  selectPane (pane) {
    if (this._selectedTab !== pane.tab) {
      this.publish('SelectPane', pane);
    }
    this.showPane(pane);
  }
  getSelectedPane () {
    return this._selectedPane;
  }
  showPane (pane) {
    if (!pane) {
      return;
    }

    var tab = pane.tab;
    $.removeClass(this._selectedTab, this._opts.activeTabClassName);
    $.addClass(tab, this._opts.activeTabClassName);
    this._selectedTab = tab;
    if (this._selectedPane) {
      this._selectedPane.hide();
    }

    this._selectedPane = pane;
    pane.show();
    this.publish('ShowPane', pane);
  }
};
exports.prototype._def = {
  className: 'tabbedPane',
  activeTabClassName: 'selected',
  children: [{
    id: 'tabContainerWrapper',
    className: 'tabContainerWrapper',
    children: [{
      id: 'tabContainer',
      className: 'tabContainer',
      tagName: 'ul'
    }]
  },
  {
    id: 'tabContentsWrapper',
    className: 'tabContentsWrapper',
    children: [{
      id: 'tabContent',
      className: 'tabContents'
    }]
  }
  ]
};
var TabbedPane = exports;

var sortID = 0;

exports.Pane = class extends Widget {
  getTitle () {
    return this._opts.title;
  }
  constructor (opts) {
    this._sortIndex = ++sortID;

    this._def = {
      className: opts.tabPaneClassName === undefined ? 'tabPane' : opts.tabPaneClassName,
      style: { display: 'none' }
    };

    this.tab = $({
      tagName: 'li',
      children: [{
        tagName: 'a',
        text: opts.title
      }],
      className: 'tab'
    });

    super(...arguments);
  }
  setSortIndex (sortIndex) {
    this._sortIndex = sortIndex;
  }
};

export default exports;
