let exports = {};

import {
  merge,
  logger,
  bind
} from 'base';

import browser from 'util/browser';
let $ = browser.$;
jsio('import .Element, .Events, .global');
import i18n from './i18n';
import Delegate from './Delegate';
import Model from './models/Model';
import bindings from './models/bindings';
import transitions from './transitions';

import __imports__ from './__imports__';
let WIDGET_CLASSES = __imports__.classes;

var uid = 0;

function shallowCopy (p) {
  var o = {};
  for (var i in p) {
    if (p.hasOwnProperty(i)) {
      o[i] = p[i];
    }
  }
  return o;
}

class WidgetSet {
  constructor (target) {
    this._target = target;
    this.events = [];
  }
  getTarget () {
    return this._target;
  }
  hasWidget (id) {
    return !!this._target[id];
  }
  addWidget (id, widget) {
    this._target[id] = widget;
  }
  addSubscription (widget, signal)
    /* ... args */
    {
    if (this._target.dispatchEvent) {
      widget.subscribe.apply(widget, [
        signal,
        this._target,
        'dispatchEvent',
        widget.getId()
      ].concat(Array.prototype.slice.call(arguments, 2)));
    }
  }
}

function _replaceNode (id) {
  var el = $.id(id);
  el.parentNode.insertBefore(this._el, el);
  el.parentNode.removeChild(el);
};

exports = class extends Element {
  __getDef__ () {
    var cls = this.constructor;
    var def = {};

    do {
      if (cls.prototype.hasOwnProperty('_def')) {
        copyDef(cls.prototype._def);
      }
    } while (cls = cls.prototype.__parentClass__);

    // handle base _def
    if (this.hasOwnProperty('_def')) {
      copyDef(this._def);
    }

    function copyDef (src) {
      for (var key in src) {
        if (key == 'attrs' || key == 'style') {
          def[key] = merge(def[key], src[key]);
        } else if (key == 'className' && def.className) {
          def.className = src.className + ' ' + def.className;
        } else if (key == 'children') {
          if (!def.children) {
            def.children = [src.children];
          } else {
            def.children.push(src.children);
          }
        } else if (!def.hasOwnProperty(key)) {
          def[key] = src[key];
        }
      }
    }

    return def;
  }
  constructor (opts) {
    super();

    opts = opts || {};

    this._children = [];

    // ===
    // merge this._def and opts
    var def = this._def = this.__getDef__();

    this._id = def.id;

    this.__model = new Model(opts.model || def.model);

    // className merges
    if (def.className) {
      opts.className = opts.className ? opts.className + ' ' + def.className :
        def.className;
    }

    if (def.attrs) {
      opts.attrs = merge(opts.attrs, def.attrs);
    }

    if (def.style) {
      opts.style = merge(opts.style, def.style);
    }

    // opts take precedence over def
    this._opts = opts;
    for (var name in def) {
      if (name != 'children' && !opts.hasOwnProperty(name) && def.hasOwnProperty(
          name)) {
        opts[name] = def[name];
      }
    }

    // delete opts.children;
    // end merge
    // ===
    if (opts.name) {
      this._name = opts.name;
    }
    if (opts.delegate) {
      this.delegate = opts.delegate;
    }

    var widgetParent;
    var buildNow = false;
    if (opts.widgetParent) {
      widgetParent = opts.widgetParent;
    }

    this.controller = opts.controller || widgetParent;

    if (opts.parent) {
      var parent = opts.parent;
      var isWidgetParent = parent instanceof Widget;
      if (isWidgetParent) {
        if (!widgetParent) {
          widgetParent = opts.parent;
        }

        opts.parent = parent.getContainer();
      } else if (!parent.appendChild) {
        delete opts.parent;
      }
    }

    if (widgetParent) {
      widgetParent.addWidget(this);
    } else if (opts.parent || opts.el) {
      this.build(opts.el);
    }
  }
  getOpts () {
    return this._opts;
  }
  getId () {
    return this._id || this._el && this._el.id;
  }
  build (el) {
    if (!this._el || this._el != el) {
      var opts = this._opts;
      var children = opts.children;

      if (children) {
        delete opts.children;
      }
      this._el = $.create(this._opts);
      if (children) {
        opts.children = children;
      }

      this.buildContent();
    }

    return this;
  }
  getParent () {
    return this._el && this._el.parentNode;
  }
  getWidgetParent () {
    return this._widgetParent;
  }
  setWidgetParent (parent) {
    if (this._widgetParent != parent) {
      this._widgetParent.removeWidget(this);
      parent.addWidget(this);
      this._widgetParent = parent;
    }
  }
  getChildren () {
    return this._children;
  }
  forEachDescend (cb, ctx) {
    var n = this._children.length;
    for (var i = 0; i < n; ++i) {
      var child = this._children[i];
      cb.call(ctx, child);
      if (child.forEachDescend) {
        child.forEachDescend(cb, ctx);
      }
    }
  }
  getFirstChild () {
    return this._children && this._children.length ? this._children[0] :
      null;
  }
  dispatchEvent (id, evt) {
    this.delegate.apply(this, arguments);
  }
  addElement (el) {
    this._el.appendChild(el);
  }
  addWidget (def, parent, result) {
    if (!this._el) {
      this.build();
    }

    parent = def.parent || parent || this.getContainer() || this._el;

    // def is either a Widget or a definition for a Widget
    if (!(def instanceof Widget)) {
      // if it is not yet a widget, make it (or make a DOM node)
      var opts = merge({}, def, {
        parent: parent,
        __result: result
      });
      if (opts.children) {
        var children = opts.children;
        delete opts.children;
      }

      var el;
      if ('type' in opts && !opts.type) {
        logger.warn('Did you forget to provide a type?', opts);
      }

      if (!opts.type || typeof opts.type == 'string') {
        if (WIDGET_CLASSES[opts.type]) {
          // var Constructor = jsio('import ' + WIDGET_CLASSES[opts.type]);
          var Constructor = WIDGET_CLASSES[opts.type];
          el = new Constructor(opts);
        } else if (!result) {
          el = new Widget(opts);
        } else {
          if (opts.type == 'image') {
            opts = merge({ tag: 'img' }, opts);
          }
          el = $(opts);
        }
      } else {
        el = new opts.type(opts);
      }

      if (result && opts.id && !result.hasWidget(opts.id)) {
        result.addWidget(opts.id, el);
      }
    } else {
      el = def;
    }

    if (el instanceof Widget) {
      if (el.getWidgetParent() != this) {
        var prevParent = el.getWidgetParent();
        if (prevParent) {
          prevParent.removeWidget(this);
        }

        el._widgetParent = this;
        if (!el.controller) {
          el.controller = this;
        }

        this._children.push(el);
      }

      if (el.getParent() != parent) {
        el.setParent(parent);
      }
    }

    if (children) {
      if (el.buildChildren) {
        if (!result) {
          result = new WidgetSet(el);
        }
        el.buildChildren(children, null, result);
      } else {
        for (var i = 0, c; c = children[i]; ++i) {
          this.addWidget(c, el, result);
        }
      }
    }

    return el;
  }
  removeChild (widget) {
    if (widget.remove) {
      widget.remove();
    }

    this.removeWidget(widget);
  }
  removeWidget (widget) {
    var index = this._children.indexOf(widget);
    if (index >= 0) {
      this._children.splice(index, 1);
    }
  }
  getContainer () {
    return this._el;
  }
  getName () {
    return this._name;
  }
  setName (name) {
    this._name = name;
  }
  buildContent () {
    var opts = this._opts;

    if (global.getWidgetPrefix() !== null) {
      $.addClass(this._el, global.getWidgetPrefix() + this._css);
    }

    if (!this.delegate) {
      this.delegate = new Delegate();
    }

    // TODO: what's this doing here?
    if (opts.errorLabel) {
      this._errorLabel = $.create({
        html: opts.errorLabel,
        className: global.getWidgetPrefix() + 'textInputErrorLabel',
        parent: this._el
      });
    }

    // def items always go on the widget
    var def = this._def;

    // build each set of children separately so the parent container can
    // be checked/recomputed after each set
    if (def.children) {
      var localRes = new WidgetSet(this);
      for (var i = def.children.length - 1; i >= 0; --i) {
        this.buildChildren(def.children[i], null, localRes);
      }
    }

    // primary target for opts children is the result passed in
    var result = opts.__result || localRes || new WidgetSet(this);

    // opts items sometimes go on the widget
    if (opts.children) {
      this.buildChildren(opts.children, null, result);
    }

    if (opts.data && this.setData) {
      bindings.parseData(this, opts.data);
    }

    this.buildWidget(this._el, result);
  }
  buildChildren (children, parent, result) {
    if (!parent) {
      parent = this.getContainer() || this._el;
    }

    for (var i = 0, n = children.length; i < n; ++i) {
      this.addWidget(children[i], parent, result);
    }
  }
  buildWidget () {}
  errors () {
    return this.validators.map(function (item) {
      if (item.isValid == false) {
        return item.message;
      }
    });
  }
  validate () {
    var isValid = true;
    for (var i = 0, len = this.validators.length; i < len; ++i) {
      var v = this.validators[i];
      isValid = isValid && (v.isValid = v.call(this));
    }
    return this._isValid = isValid;
  }
  isValid () {
    return this._isValid;
  }
  getI18n (key, id) {
    var src = key in this._opts ? this._opts : i18n.get(id || this._opts.id);

    return src && src[key] || '';
  }
  getElement () {
    if (!this._el) {
      this.build();
    }
    return this._el;
  }
  addClass (cls) {
    $.addClass(this._el, cls);
  }
  removeClass (cls) {
    $.removeClass(this._el, cls);
  }
  hasClass (cls) {
    return (' ' + this._el.className + ' ').indexOf(cls) >= 0;
  }
  toggleClass (cls, isToggled) {
    if (isToggled === undefined) {
      isToggled = !this.hasClass(cls);
    }

    if (isToggled) {
      this.addClass(cls);
    } else {
      this.removeClass(cls);
    }
  }
  onBeforeShow () {
    for (var i = 0, child; child = this._children[i]; ++i) {
      child.onBeforeShow.apply(child, arguments);
    }
  }
  onShow () {
    this._isShowing = true;
    for (var i = 0, child; child = this._children[i]; ++i) {
      child.onShow.apply(child, arguments);
    }
  }
  onBeforeHide () {
    for (var i = 0, child; child = this._children[i]; ++i) {
      child.onBeforeHide.apply(child, arguments);
    }
  }
  onHide () {
    this._isShowing = false;
    for (var i = 0, child; child = this._children[i]; ++i) {
      child.onHide.apply(child, arguments);
    }
  }
  isShowing () {
    return this._visibleState == 'beforeVisible' || this._visibleState ==
      'visible';
  }
  show () {
    this._visibleState = 'beforeVisible';

    var el = this.getElement();
    var transition = new (this._opts.hideTransition || transitions.CSSTransition)({ target: el });
    this.onBeforeShow && transition.on('start', bind(this, 'onBeforeShow'));
    transition.on('start', bind(this, function () {
      var style = this._opts && this._opts.style;
      var display = style && style.display != 'none' && style.display ||
        '';
      if (this._el && this._visibleState == 'beforeVisible') {
        this._el.style.display = display;
        if (getComputedStyle(this._el, 'display') == 'none') {
          this._el.style.display = 'block';
        }
        this._visibleState = 'visible';
      }
    }));

    this.onShow && transition.on('end', bind(this, 'onShow'));
    return transition;
  }
  hide () {
    this._visibleState = 'beforeHidden';

    var el = this.getElement();
    var transition = new (this._opts.hideTransition || transitions.CSSTransition)({ target: el });
    this.onBeforeHide && transition.on('start', bind(this, 'onBeforeHide'));
    transition.on('end', bind(this, function () {
      if (this._visibleState == 'beforeHidden') {
        $.hide(el);
      }
    }));

    this.onHide && transition.on('end', bind(this, 'onHide'));
    return transition;
  }
  removeChildren () {
    this._children.forEach(function (child) {
      child.remove();
    });
  }
  remove () {
    this.onBeforeHide();
    $.remove(this.getElement());
    this.onHide();
  }
  getModel () {
    return this.__model;
  }
  setModel (path, value) {
    if (arguments.length == 1) {
      this.__model.setObject(path);
    } else {
      this.__model.set(path, value);
    }

    return this;
  }
  putHere () {
    if (!this._el) {
      this.build();
    }

    var id = 'jsioWidgetId' + ++uid;
    global.getTargetDocument().write('<div id="' + id + '"></div>');
    setTimeout(bind(this, _replaceNode, id), 0);

    return this;
  }
  setParent (parent) {
    var el = parent && (parent.getContainer && parent.getContainer() ||
      parent.appendChild && parent || $.id(parent));

    if (el) {
      if (!this._el) {
        this._opts.parent = el;
        this.build();
      } else {
        el.appendChild(this._el);
      }
    }

    return this;
  }
};
exports.prototype._css = 'widget';
exports.prototype._name = '';
exports.prototype.addChild = exports.prototype.addWidget;
exports.prototype._isValid = true;
exports.prototype.validators = [];
exports.prototype.appendTo = exports.prototype.setParent;
var Widget = exports;

// Mix in Events
// TODO: is this correct?
for (let k in Events) {
  Widget.prototype[k] = Events.prototype[k];
}

var map = {};
var lowerCaseMap = {};
Widget.register = function (cls, name) {
  if (name in map) {
    throw Error('A widget with name \'' + name + '\' is already registered');
  }
  map[name] = cls;
  lowerCaseMap[name.toLowerCase()] = cls;
};

Widget.get = function (name) {
  return lowerCaseMap[name.toLowerCase()];
};

Widget.WidgetSet = WidgetSet;

export default exports;
