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
import {
  merge,
  bind
} from 'base';

import TextView from 'ui/TextView';
import View from 'ui/View';
import ImageScaleView from 'ui/ImageScaleView';
import EditText from 'platforms/browser/EditText';


var defaults = {
  color: 'black',
  hintColor: '#979797',
  paddingLeft: 20,
  paddingRight: 20,
  paddingTop: 0,
  paddingBottom: 0
};

export default class TextEditView extends ImageScaleView {
  constructor (opts) {
    opts = merge(opts || {}, defaults);
    super(opts);

    this._clipper = new View({
      x: 0,
      y: 0,
      width: this._opts.width - this._opts.paddingLeft,
      height: this._opts.height,
      clip: true
    });

    this._textBox = new TextView(merge({
      x: this._opts.paddingLeft,
      y: this._opts.paddingTop,
      autoFontSize: false,
      size: opts.size || 32,
      horizontalAlign: opts.horizontalAlign || 'left',
      width: opts.width - this._opts.paddingLeft - this._opts.paddingRight,
      height: opts.height
    }, opts));

    this._clipper.addSubview(this._textBox);
    this.addSubview(this._clipper);
    this._focused = false;
    this._validInputStart = false;
    this._textFilter = null;
    this._textCursorFilter = null;
    this._backTextEditView = null;
    this._forwardTextEditView = null;
    this._hint = this._opts.hintJs || this._opts.hint;
    this._hintSet = false;
    this._cursorPos = -1;
    this._normalColor = this._opts.color;
    this._hintColor = this._opts.hintColor;
    this._editText = new EditText(merge({}, // avoid side effects
      merge(opts, {
        title: this._hint,
        textEditView: this,
        onChange: bind(this, 'onChange'),
        onSubmit: bind(this, 'onSubmit'),
        onFinishEditing: bind(this, 'onFinishEditing'),
        onFocusChange: bind(this, this.onFocusChange)
      })));

    this.setText(this._opts.text || '');
  }
  onSubmit () {}
  onFinishEditing () {}
  onInputStart () {
    this._validInputStart = true;
  }
  onInputSelect () {
    if (this._validInputStart) {
      this.requestFocus();
      this._validInputStart = false;
    }
  }
  requestFocus (noSubmit) {
    this._focused = true;
    this._editText.requestFocus(noSubmit);
    this.refresh();
  }
  removeFocus (noSubmit) {
    this._editText.closeEditField(noSubmit);
  }
  refresh () {
    this._editText.refresh(this.getText(), this._backTextEditView != null,
      this._forwardTextEditView != null, this._cursorPos);
  }
  onFocusChange (focused) {
    if (focused) {
      this.emit('focusAdd');
    } else {
      this.emit('focusRemove');
    }
  }
  onChange (value, prevValue, cursorPos) {
    var isProcessed;
    var isCursorSet;

    if (value !== this._textBox.getText()) {
      isProcessed = typeof this._textFilter === 'function';
      isCursorSet = typeof this._textCursorFilter === 'function';

      if (isProcessed) {
        if (isCursorSet) {
          this._cursorPos = this._textCursorFilter(value || '', prevValue ||
            '', cursorPos || 0);
        }

        value = this._textFilter(value || '', prevValue || '');
      }

      this.setText(value);

      if (isProcessed) {
        this.setValue(value, this._cursorPos);
      }

      // update native EditText with processed values
      this.emit('onChange', value);
    }
  }
  setBackward (view) {
    this._backTextEditView = view;
  }
  setForward (view) {
    this._forwardTextEditView = view;
  }
  registerTextFilter (fn, fn2) {
    this._textFilter = fn;
    this._textCursorFilter = fn2;
  }
  getText () {
    var result;

    if (this._hintSet) {
      result = '';
    } else {
      result = this._textBox.getText();
    }

    return result;
  }
  getValue () {
    return this._editText.getValue();
  }
  setValue (value) {
    this.setText(value);

    if (this._editText.setValue) {
      this._editText.setValue(value, this._cursorPos);
    }
  }
  setText (text) {
    if ((text == null || text != null && text.length == 0) && this._hint !=
      null) {
      this._hintSet = true;
      text = this._hint;
      this._textBox._opts.color = this._hintColor;
    } else {
      this._hintSet = false;
      this._textBox._opts.color = this._normalColor;
    }

    this._textBox.setText(text);
  }
  setHint (hint) {
    this._hint = hint;
    this._editText.setHint(hint);
    this.setText(this.getText());
  }
}
