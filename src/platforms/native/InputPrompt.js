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

var activeInputs = {};

var KeyboardTypes = {
	Default: 0,                // Default type for the current input method.
    NumbersAndPunctuation: 2,  // Numbers and assorted punctuation.
    URL: 3,                    // A type optimized for URL entry (shows . / .com prominently).
    NumberPad: 4,              // A number pad (0-9). Suitable for PIN entry.
    PhonePad: 5,               // A phone pad (1-9, *, 0, #, with letters under the numbers).
    EmailAddress: 7,           // A type optimized for multiple email address entry (shows space @ . prominently).
    DecimalPad: 8
}

NATIVE.InputPrompt.subscribe('Submit', function (evt) {
	var input = activeInputs[evt.id];

	if (input) {
		input.setValue(evt.text);
		input.onChange && input.onChange(evt.text);
	}
});

NATIVE.InputPrompt.subscribe('Cancel', function (evt) {
	var input = activeInputs[evt.id];

	if (input) {
		input.onChange && input.onChange(input.getValue());
		delete activeInputs[evt.id];
	}
});

exports = Class(function () {
	this.init = function (opts) {
		opts = opts || {};
		this.onChange = opts.onChange;
		this._value = opts.value != undefined ? opts.value : '';
		this._title = opts.title != undefined ? opts.title : '';
		this._message = opts.prompt != undefined ? opts.prompt : '';
		this._autoShowKeyboard = opts.autoShowKeyboard !== undefined ? opts.autoShowKeyboard : false;
		this._isPassword = opts.isPassword !== undefined ? opts.isPassword : false;
		if (typeof opts.keyboardType === 'string') {
			opts.keyboardType = KeyboardTypes[opts.keyboardType];
		}
		this._keyboardType = opts.keyboardType !== undefined ? opts.keyboardType : KeyboardTypes.default;
		this._id = -1;
	};

	this.show = function () {
		this._id = NATIVE.inputPrompt.show(this._title, this._message, this._value, this._autoShowKeyboard, this._isPassword, this._keyboardType);
		activeInputs[this._id] = this;
	};

	this.setValue = function (value) {
		this._value = value;
	};

	this.setKeyboardType = function (keyboardType) {
		this._keyboardType = keyboardType;
	};

	this.getValue = function () {
		return this._value;
	};

	this.setMessage = function (message) {
		this._message = message;
	};

	this.requestFocus = function() { this.show(); }

	this.closeEditField = function() {}

	this.refresh = function() {}
});
exports.KeyboardTypes = KeyboardTypes;
