let exports = {};

import {
  merge,
  bind
} from 'base';

import browser from 'util/browser';
let $ = browser.$;
import Widget from './Widget';
import bindings from 'squill/models/bindings';

exports = class extends Widget {
  constructor (opts) {
    opts = merge(opts, {
      name: '',
      value: '',
      multiline: false
    });

    this._def = {
      children: [{
        tag: opts.multiline ? 'textarea' : 'input',
        id: '_input',
        attrs: {
          type: 'text',
          value: opts.value,
          name: opts.name
        },
        style: merge(opts.textStyle, {
          MozBoxSizing: 'border-box',
          WebkitBoxSizing: 'border-box',
          MsBoxSizing: 'border-box',
          boxSizing: 'border-box'
        })
      }],
      style: { position: 'relative' }
    };

    if (opts.prefixLabel) {
      this._def.children.unshift({
        id: '_label',
        text: opts.label
      });
    }

    super(opts);
  }
  buildWidget () {
    var el = this._el;
    var type = this._opts.type;
    if ('ontouchstart' in this._el) {
      this._overlay = $({
        parent: this._el,
        attrs: { noCapture: true },
        style: {
          position: 'absolute',
          top: '0px',
          left: '0px',
          width: '100%',
          height: '100%',
          zIndex: 1
        }
      });

      this._overlay.addEventListener('click', bind(this, function () {
        $.hide(this._overlay);
        this._input.focus();
      }), true);
    }

    var opts = this._opts;
    if (!opts.prefixLabel || opts.placeholder) {
      var label = this.getI18n('label');
      if (this._input.getAttribute('placeholder') === null) {
        this._input.setAttribute('placeholder', opts.placeholder || label);
      } else {
        this._placeholder = $.create({
          tag: 'button',
          text: label,
          style: { position: 'absolute' },
          parent: el
        });
      }
    }

    this.initMouseEvents(el);
    this.initFocusEvents(this._input);
    this.initKeyEvents(this._input);
  }
  focus () {
    this._input.focus();
  }
  blur () {
    this._input.blur();
  }
  getInputElement () {
    return this._input;
  }
  setName (name) {
    super.setName(...arguments);

    if (this._input) {
      this._input.name = name;
    }
  }
  setValue (value) {
    if (value === undefined) {
      value = '';
    }

    this.saveSelection();
    this._value = this._input.value = value;
    this.restoreSelection();
  }
  getValue () {
    return this._input.value;
  }
  onKeyDown () {
    super.onKeyDown(...arguments);
    if (this._placeholder) {
      $.hide(this._placeholder);
    }
  }
  onKeyUp () {
    super.onKeyUp(...arguments);
    this.checkLabel();
    this.checkValue();
  }
  onMouseDown (evt) {
    super.onMouseDown(...arguments);

    evt.stopPropagation();
  }
  onKeyPress (e) {
    super.onKeyPress(...arguments);
    if (e.keyCode == 13) {
      this.publish('EnterPressed');
    }
    this.checkValue();
  }
  onBlur () {
    super.onBlur();
    this.checkLabel();

    if (this._overlay) {
      $.show(this._overlay);
    }
  }
  isValid () {
    return this._isValid;
  }
  checkValue () {
    var value = this._input.value;
    var formatter = this._opts.formatter;
    if (formatter) {
      value = formatter(value);
    }

    if (value == INVALID_VALUE) {
      this._isValid = false;
      $.addClass(this._el, 'invalid');
      return;
    }

    this._isValid = true;
    $.removeClass(this._el, 'invalid');
    if (this._value != value) {
      this._value = value;
      var input = this._input;
      if (value != input.value) {
        this.saveSelection();
        input.value = value;
        this.restoreSelection();
      }
      this.publish('change', this._value);
      this.publish('ValueChange', this._value);
    }
  }
  saveSelection () {
    this._selection = {
      start: this._input.selectionStart,
      end: this._input.selectionEnd
    };
  }
  restoreSelection () {
    var input = this._input;
    if (this._isFocused) {
      input.selectionStart = this._selection.start;
      input.selectionEnd = this._selection.end;
    }
  }
  checkLabel () {
    if (this._placeholder && /^\s*$/.test(this._input.value)) {
      $.show(this._placeholder);
    }
  }
  onClick () {
    super.onClick();
  }
  setEnabled (isEnabled) {
    this._isEnabled = isEnabled;
    if (isEnabled) {
      delete this._input.disabled;
      this.removeClass('disabled');
    } else {
      this._input.disabled = true;
      this.addClass('disabled');
    }
  }
  isFocused () {
    return this._isFocused;
  }
  isEnabled () {
    return this._isEnabled;
  }
  disable () {
    this.setEnabled(false);
  }
  enable () {
    this.setEnabled(true);
  }
};
exports.prototype._type = 'text';
exports.prototype._css = 'textInput';
exports.prototype.setData = exports.prototype.setValue;
var TextInput = exports;

exports.INVALID_VALUE = {};
var INVALID_VALUE = exports.INVALID_VALUE;

Widget.register(TextInput, 'TextInput');

export default exports;
