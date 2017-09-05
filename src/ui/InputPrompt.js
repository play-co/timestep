let exports = {};

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
/* globals DEBUG, jsio */
import { merge } from 'base';

import device from 'device';
import deprecated from './debug/deprecated';
import debugTypes from './debug/types';

import keyboardTypes from './keyboardTypes';
import inputDialog from 'platforms/browser/inputDialog';

/**
 * @class InputPrompt
 *
 * Shows a native dialog that prompts the user for input.  In the tealeaf
 * runtime, this will open a native Android and iOS prompt.  In the browser, we
 * create a pure-DOM alternative of a one or two button prompt view using the
 * <input> tag and HTML5 input types.
 *
 */
exports = class {
  constructor (opts) {
    opts = opts || {};

    function get (prop, defaultValue) {
      return opts[prop] !== undefined ? opts[prop] : defaultValue;
    }

    this._opts = merge({
      title: get('title', ''),
      value: get('value', ''),
      okText: get('okText', 'ok'),
      cancelText: get('cancelText', 'cancel'),
      message: get('message', get('prompt', '')),
      autoFocus: !!get('autoFocus', get('autoShowKeyboard', true)),
      isPassword: !!get('isPassword', false),
      keyboardType: get('keyboardType', 'default'),
      defaultBrowserStyles: get('defaultBrowserStyles', true)
    }, opts);

    // set handlers
    this.onChange = this._opts.onChange;
    this.onSubmit = this._opts.onSubmit;

    if (DEBUG) {
      debugTypes.check('InputPrompt', {
        'title': {
          value: this._opts.title,
          type: 'string',
          required: true
        },
        'message (prompt)': {
          value: this._opts.message,
          type: 'string',
          required: true
        },
        'ok text': {
          value: this._opts.okText,
          type: 'string',
          required: true
        },
        'cancel text': {
          value: this._opts.cancelText,
          type: 'string',
          required: true
        },
        'value': {
          value: this._opts.value,
          type: 'string',
          required: true
        },
        'auto-show keyboard': {
          value: this._opts.autoShowKeyboard,
          type: 'boolean',
          require: true
        },
        'is password field': {
          value: this._opts.isPassword,
          type: 'boolean',
          require: true
        },
        'keyboard type': {
          value: this._opts.keyboardType,
          type: 'key',
          dictionary: exports.KeyboardTypes.htmlTypes,
          toLowerCase: true,
          require: true
        }
      });
    }
  }
  show () {
    this._prompt = inputDialog.show(this, this._opts);
  }
  getValue () {
    return this._opts.value;
  }
  setValue (value) {
    this._opts.value = value;
    return this;
  }
  setOkButton (value) {
    this._opts.okText = value;
    return this;
  }
  setCancelButton (value) {
    this._opts.cancelText = value;
    return this;
  }
  setKeyboardType (keyboardType) {
    this._opts.keyboardType = keyboardType;
    return this;
  }
  setMessage (message) {
    this._opts.message = message;
    return this;
  }
};

deprecated.method(exports.prototype, 'requestFocus', function () {
  this.show();
  return this;
});
deprecated.method(exports.prototype, 'closeEditField');
deprecated.method(exports.prototype, 'refresh');
deprecated.method(exports.prototype, 'setHint');

exports.KeyboardTypes = keyboardTypes;

export default exports;
