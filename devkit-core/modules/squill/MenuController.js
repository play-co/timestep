let exports = {};

import { bind } from 'base';

import Animation from 'util/Animation';
import browser from 'util/browser';
let $ = browser.$;
import Widget from './Widget';
import transforms from './transforms';

exports = class extends Widget {
  constructor (opts) {
    super(...arguments);
    this._stack = [];
    this._isVisible = false;
  }
  isVisible () {
    return this._isVisible;
  }
  setVisible (isVisible) {
    if (this._isVisible != isVisible) {
      this._isVisible = isVisible;
      this.publish('VisibleChange', isVisible);
    }
  }
  getCurrentView () {
    if (!this._stack.length) {
      return null;
    }
    return this._stack[this._stack.length - 1];
  }
  push (view, dontAnimate) {
    for (var i = 0, v; v = this._stack[i]; ++i) {
      if (view == v) {
        this.popTo(view);
        return;
      }
    }

    // don't animate the first (base) view of a stackview unless explicitly asked to
    if (!this._stack[0] && dontAnimate !== false) {
      dontAnimate = true;
    }

    view.controller = this;

    var current = this.getCurrentView();
    this._stack.push(view);

    var calls = [
      this._show(view, dontAnimate),
      current && this._hide(current, dontAnimate)
    ];

    if (calls[0]) {
      setTimeout(function () {
        calls[0] && calls[0]();
        calls[1] && calls[1]();
      });
    }

    return view;
  }
  _hide (view, dontAnimate, backward) {
    var el = view.getElement(),
      w = el.offsetWidth,
      onFinish = bind(this, function () {
        $.remove(el);
        view.onHide();
        view.publish('DidHide');
      });

    view.onBeforeHide();
    view.publish('BeforeHide');

    if (!dontAnimate) {
      return function () {
        transforms.move(el, (backward ? 1 : -1) * w, 0,
          '0.5s ease-in-out', onFinish);
      };
    } else {
      onFinish();
    }
  }
  _show (view, dontAnimate, backward) {
    // hidden side effect: will build the menu for menus that haven't been built yet
    var el = view.getElement();

    el.style.visibility = 'hidden';
    this.getElement().appendChild(el);

    var onFinish = bind(this, function () {
      transforms.setLeft(el, 0);
      el.style.visibility = 'visible';
      view.onShow();
      this.publish('DidShow', view);
    });

    var w = el.offsetWidth;
    view.onBeforeShow();
    view.publish('BeforeShow');
    if (!dontAnimate) {
      transforms.setLeft(el, (backward ? -1 : 1) * w);
      el.style.visibility = 'visible';
      return function () {
        transforms.move(el, 0, 0, '0.5s ease-in-out', onFinish);
      };
    } else {
      onFinish();
    }
  }
  fadeOut (dontAnimate) {
    var view = this._stack[this._stack.length - 1],
      el = this.getElement();

    this.setVisible(false);

    if (view) {
      view.onBeforeHide();
      view.publish('BeforeHide');
    }

    var onFinish = bind(this, function () {
      if (el.parentNode) {
        this._parent = el.parentNode;
      }
      $.remove(el);
      if (view) {
        view.onHide();
        view.publish('DidHide');
      }
    });

    if (!dontAnimate) {
      new Animation({
        duration: 250,
        subject: function (t) {
          $.style(el, { opacity: 1 - t });
        },
        onFinish: onFinish
      }).seekTo(1);
    } else {
      onFinish();
    }
  }
  fadeIn (dontAnimate) {
    var view = this._stack[this._stack.length - 1],
      el = this.getElement(),
      onFinish = function () {
        $.style(el, { opacity: 1 });
        if (view) {
          view.onShow();
          view.publish('DidShow');
        }
      };

    this.setVisible(true);

    var viewEl = view.getElement();
    transforms.setLeft(viewEl, 0);
    el.appendChild(viewEl);

    $.style(el, { opacity: 0 });
    this._parent.appendChild(el);

    if (view) {
      view.onBeforeShow();
      view.publish('BeforeShow');
    }
    if (!dontAnimate) {
      new Animation({
        duration: 250,
        subject: function (t) {
          $.style(el, { opacity: t });
        },
        onFinish: onFinish
      }).seekTo(1);
    } else {
      onFinish();
    }
  }
  popTo (view, dontAnimate) {
    var n = this._stack.length;
    if (n && this._stack[n - 1] != view) {
      this.subscribeOnce('DidPop', this, 'popTo', view, dontAnimate);
      this.pop(dontAnimate);
    }
  }
  pop (dontAnimate) {
    if (!this._stack.length) {
      return false;
    }

    var view = this._stack.pop();

    var calls = [
      this._hide(view, dontAnimate, true),
      this._isVisible && this._stack[0] && this._show(this._stack[this._stack
        .length - 1], dontAnimate, true)
    ];

    if (calls[0]) {
      setTimeout(function () {
        calls[0] && calls[0]();
        calls[1] && calls[1]();
      });
    }

    return view;
  }
  popAll (dontAnimate) {
    while (this._stack[1]) {
      this.pop(dontAnimate);
    }
  }
};

exports.prototype._def = { className: 'menuController' };
export default exports;
