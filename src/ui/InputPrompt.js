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

 /* globals NATIVE, DEBUG, jsio */

import device;
import .debug.deprecated as deprecated;

var inputDialog = device.get('inputDialog');

/**
 * @class InputPrompt
 *
 * Shows a native dialog that prompts the user for input.  In the tealeaf
 * runtime, this will open a native Android and iOS prompt.  In the browser, we
 * create a pure-DOM alternative of a one or two button prompt view using the
 * <input> tag and HTML5 input types.
 *
 */
exports = Class(function () {
  /**
   * @param {string} opts.title the prompt title
   * @param {string} opts.value the value passed to the callbacks
   * @param {function} opts.onChange called with value when value in prompt changes
   * @param {function} opts.onSubmit called wtih value when prompt is submitted
   * @param {function} opts.onCancel called with value when prompt is cancelled
   * @param {string} [opts.okText='ok'] sets custom text for the ok button
   * @param {string} [opts.cancelText='cancel'] sets custom text for the cancel button
   * @param {boolean} [opts.autoShowKeyboard=true] opens the keyboard by default on mobile devices
   * @param {boolean} [opts.isPassword=false] sets the input type to a password
   * @param {string} [opts.keyboardType='Default'] sets the type of keyboard {@link keyboardTypes.rawTypes}
   * @param {boolean} [opts.defaultBrowserStyles] use default browser styles
   */
  this.init = function (opts) {
    opts = opts || {};

    function get(prop, defaultValue) {
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
      jsio("import .debug.types").check('InputPrompt', {
        'title': {value: this._opts.title, type: 'string', required: true},
        'message (prompt)': {value: this._opts.message, type: 'string', required: true},
        'ok text': {value: this._opts.okText, type: 'string', required: true},
        'cancel text': {value: this._opts.cancelText, type: 'string', required: true},
        'value': {value: this._opts.value, type: 'string', required: true},
        'auto-show keyboard': {value: this._opts.autoShowKeyboard, type: 'boolean', require: true},
        'is password field': {value: this._opts.isPassword, type: 'boolean', require: true},
        'keyboard type': {value: this._opts.keyboardType, type: 'key', dictionary: exports.KeyboardTypes.htmlTypes, toLowerCase: true, require: true}
      });
    }
  };

  this.show = function () {
    this._prompt = inputDialog.show(this, this._opts);
  };

  this.getValue = function () {
    return this._opts.value;
  };

  this.setValue = function (value) {
    this._opts.value = value;
    return this;
  };

  this.setOkButton = function (value) {
    this._opts.okText = value;
    return this;
  };

  this.setCancelButton = function (value) {
    this._opts.cancelText = value;
    return this;
  };

  this.setKeyboardType = function (keyboardType) {
    this._opts.keyboardType = keyboardType;
    return this;
  };

  this.setMessage = function (message) {
    this._opts.message = message;
    return this;
  };

  deprecated.method(this, 'requestFocus', function () {
    this.show();
    return this;
  });
  deprecated.method(this, 'closeEditField');
  deprecated.method(this, 'refresh');
  deprecated.method(this, 'setHint');
});

import .keyboardTypes as exports.KeyboardTypes;
