/**
 * @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */

var activeInputs = {};

NATIVE.InputPrompt.subscribe('Submit', function(evt) {
	var input = activeInputs[evt.id];

	if (input) {
		input.setValue(evt.text);
		input.onChange && input.onChange(evt.text);
	}
});

NATIVE.InputPrompt.subscribe('Cancel', function(evt) {
	var input = activeInputs[evt.id];

	if (input) {
		input.onChange && input.onChange(input.getValue());
		delete activeInputs[evt.id];
	}
});

exports = Class(function() {
	this.init = function (opts) {
		opts = opts || {};
		this.onChange = opts.onChange;
		this._value = opts.value != undefined ? opts.value : '';
		this._title = opts.title != undefined ? opts.title : '';
		this._message = opts.prompt != undefined ? opts.prompt : '';
		this._autoShowKeyboard = opts.autoShowKeyboard !== undefined ? opts.autoShowKeyboard : false;
		this._isPassword = opts.isPassword !== undefined ? opts.isPassword : false;
		this._id = -1;
	};

	this.show = function () {
		this._id = NATIVE.inputPrompt.show(this._title, this._message, this._value, this._autoShowKeyboard, this._isPassword);
		activeInputs[this._id] = this;
	};

	this.setValue = function (value) {
		this._value = value;
	};

	this.getValue = function () {
		return this._value;
	};

	this.setMessage = function (message) {
		this._message = message;
	};
});

