let exports = {};

import {
  merge,
  bind
} from 'base';

import browser from 'util/browser';
let $ = browser.$;
import Widget from './Widget';

import hint from './hint';

exports = class extends Widget {
  constructor (params) {
    params = merge(params, {
      tag: 'button',
      isEnabled: true
    });
    this._isEnabled = params.isEnabled;
    super(params);
    this._hint = params.hint;
  }
  create () {
    this._opts.style = merge(this._opts.style, {
      whiteSpace: 'nowrap',
      display: 'inline-block'
    });

    super.create(...arguments);
  }
  buildWidget () {
    var el = this._el;

    this.initMouseEvents(el);
    this.initKeyEvents(el);

    el.style.userSelect = 'none';
    el.style.MozUserSelect = 'none';
    // Mozilla
    el.style.KhtmlUserSelect = 'none';
    // Safari
    el.unselectable = 'on';
  }
  _setHintTimeout (e) {
    if (!this._hint) {
      return;
    }
    this._hintTimeout && clearTimeout(this._hintTimeout);
    this._hintTimeout = setTimeout(bind(this, function () {
      hint.show(e.pageX + 12, e.pageY + 14, this._hint);
    }), 300);
  }
  onMouseOver (e) {
    this._setHintTimeout(e);
  }
  onMouseMove (e) {
    this._setHintTimeout(e);
  }
  onMouseOut (e) {
    hint.hide();
    this._hintTimeout && clearTimeout(this._hintTimeout);
  }
  onClick (e) {
    $.stopEvent(e);
    if (!this._isEnabled) {
      return;
    }

    if (this._opts.onClick) {
      this._opts.onClick(e, this);
    }

    super.onClick(...arguments);
  }
  captureOnEnter (widget) {
    widget.subscribe('KeyDown', this, 'onKeyDown');
    widget.subscribe('KeyUp', this, 'onKeyUp');
  }
  onKeyDown (e) {
    if (e.keyCode == 13) {
      $.stopEvent(e);
      this.onMouseDown();
    }
  }
  onKeyUp (e) {
    if (e.keyCode == 13) {
      $.stopEvent(e);
      this.onMouseUp();
      this.onClick(e);
    }
  }
  blur () {
    this._el && this._el.blur();
  }
  focus () {
    this._el && this._el.focus();
  }
  setEnabled (isEnabled) {
    if (this._isEnabled != isEnabled) {
      this._isEnabled = isEnabled;
      if (!isEnabled) {
        $.addClass(this._el, 'disabled');
      } else {
        $.removeClass(this._el, 'disabled');
      }
    }
  }
};
exports.prototype._css = 'btn';
exports.prototype._type = 'button';
var Button = exports;

export default exports;
