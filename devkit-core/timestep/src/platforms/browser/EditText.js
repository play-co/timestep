/**
 * @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

// import squill.Widget;
throw new Error('TODO: ES6 SQUILL');
/*
import { merge } from 'base';
import browser from 'util/browser';
import device from 'device';

var __keyboardIsOpen = false;

class InputField extends squill.Widget {
  buildWidget () {
    this.initKeyEvents();
    this.initFocusEvents();
  }
  setValue (value) {
    this._el.value = value;
    this._prevValue = value;
  }
  setCursor (cursorPos) {
    this._el.selectionStart = this._el.selectionEnd = cursorPos;
  }
  setPlaceholder (placeholder) {
    this._el.placeholder = placeholder;
  }
  setMaxLength (maxLength) {
    this._el.maxlength = maxLength;
  }
  show () {
    super.show(...arguments);

    this._el.focus();
  }
  onKeyUp (evt) {
    var el = this._el;
    _focused && _focused.onChange(el.value, this._prevValue, el.selectionStart,
      el.selectionEnd);
    this._prevValue = el.value;
    if (evt.keyCode == 13) {
      _focused && _focused.closeEditField();
    }
  }
  getValue () {
    return this._el.value;
  }
  onBlur (evt) {
    this.hide();
    if (__keyboardIsOpen) {
      __keyboardIsOpen = false;
      var ev = new Event('keyboardClosed');
      ev.height = device.screen.height;
      window.dispatchEvent(ev);
    }
    _focused && _focused.closeEditField();
    _focused = null;
  }
  setFontColor (color) {
    this._el.style.color = color;
  }
  setHorizontalPadding (left, right) {
    this._el.style.paddingLeft = left + 'px';
    this._el.style.paddingRight = right + 'px';
  }
  setFontSize (fontSize) {
    this._el.style.fontSize = fontSize + 'px';
  }
  setFontFamily (fontFamily) {
    this._el.style.fontFamily = fontFamily;
  }
  setPosition (x, y, width, height) {
    var style = this._el.style;
    style.top = y - 1 + 'px';
    style.left = x + 'px';
    style.width = width + 'px';
    style.height = height + 'px';
  }
}

InputField.prototype._def = {
  tag: 'input',
  parent: document.body,
  style: {
    position: 'absolute',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    zIndex: '990000',
    left: '0px',
    top: '0px'
  }
};
var _input = new InputField();
_input.hide();

var _focused = null;

var defaults = {
  hint: '',
  inputType: 'default',
  // default | number | phone | password | capital
  maxLength: -1
};

export default class EditText {
  constructor (opts) {
    this._opts = merge(opts, defaults);

    this._textEditView = opts.textEditView;
    this.onFocusChange = opts.onFocusChange || function () {};
    this.onSubmit = opts.onSubmit || function () {};
  }
  onChange (value, prevValue, cursorPos, selectionEnd) {
    this._value = value;
    if (this._opts.onChange) {
      this._opts.onChange(value, prevValue, cursorPos);
    }
  }
  getValue () {
    return this._value;
  }
  setValue (value) {
    this._value = value;
    this.onChange(value);
  }
  requestFocus (noSubmit) {
    if (_focused !== this) {
      if (_focused != null) {
        _focused.removeFocus(noSubmit);
      }

      this.onFocusChange(true);
    }

    _focused = this;
  }
  closeEditField (noSubmit) {
    console.log('TextEditView editText removeFocus');
    if (_focused != null) {
      _focused.removeFocus(noSubmit);
    }

    this._showTextBox();
    _input.hide();

    if (__keyboardIsOpen) {
      __keyboardIsOpen = false;
      var ev = new Event('keyboardClosed');
      ev.height = device.screen.height;
      window.dispatchEvent(ev);
    }
  }
  _hideTextBox () {
    var textBox = this._textEditView._textBox;
    textBox.style.visible = false;
  }
  _showTextBox () {
    var textBox = this._textEditView._textBox;
    textBox.style.visible = true;
  }
  refresh (value, hasBack, hasForward, cursorPos) {
    this._hideTextBox();

    var textBox = this._textEditView._textBox;
    var pos = this._textEditView.getPosition();
    var scale = pos.width / this._textEditView.style.width;

    _input.setCursor(cursorPos);
    _input.setValue(value);
    _input.setPlaceholder(this._opts.hint);
    _input.setMaxLength(this._opts.maxLength);
    _input.setFontColor(this._opts.color);
    _input.setHorizontalPadding(this._opts.paddingLeft * scale, this._opts.paddingRight *
      scale);
    _input.setFontSize(textBox.getOpts().size * scale);
    _input.setFontFamily(textBox.getOpts().fontFamily);
    _input.setPosition(pos.x, pos.y, pos.width, pos.height);
    _input.show();

    if (!__keyboardIsOpen) {
      __keyboardIsOpen = true;
      var ev = new Event('keyboardOpened');
      ev.height = device.screen.height * 0.6;
      window.dispatchEvent(ev);
    }
  }
  hasFocus () {
    return this == _focused;
  }
  removeFocus (noSubmit) {
    this.onFocusChange(false);
    if (!noSubmit) {
      this.onSubmit(_input.getValue());
    }
    if (_focused == this) {
      _focused = null;
    }
  }
  setHint (hint) {
    this._opts.hint = hint;
  }
}
*/
