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

from util.browser import $;
import squill.Widget;
import device;

var __keyboardIsOpen = false;

var InputField = Class(squill.Widget, function (supr) {

	this._def = {
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
	}

	this.buildWidget = function () {
		this.initKeyEvents();
		this.initFocusEvents();
	}

	this.setValue = function (value) {
		this._el.value = value;
		this._prevValue = value;
	}

	this.setCursor = function (cursorPos) {
		this._el.selectionStart = this._el.selectionEnd = cursorPos;
	}

	this.setPlaceholder = function (placeholder) {
		this._el.placeholder = placeholder;
	}

	this.setMaxLength = function (maxLength) {
		this._el.maxlength = maxLength;
	}

	this.show = function () {
		supr(this, 'show', arguments);

		this._el.focus();
	}

	this.onKeyUp = function (evt) {
		var el = this._el;
		_focused && _focused.onChange(el.value, this._prevValue, el.selectionStart, el.selectionEnd);
		this._prevValue = el.value;
		if (evt.keyCode == 13) {
			_focused && _focused.closeEditField();
		}
	}

	this.getValue = function () { return this._el.value; }

	this.onBlur = function (evt) {
		this.hide();
		if (__keyboardIsOpen) {
			__keyboardIsOpen = false;
			var ev = new Event('keyboardClosed');
			ev.height = device.screen.height;
			window.dispatchEvent(ev);
		}
		_focused = null;
		//_focused && _focused.closeEditField();
	}

	this.setFontColor = function (color) {
		this._el.style.color = this._opts.color;
	}

	this.setHorizontalPadding = function (left, right) {
		this._el.style.paddingLeft = left + 'px';
		this._el.style.paddingRight = right + 'px';
	}

	this.setFontSize = function (fontSize) {
		this._el.style.fontSize = fontSize + 'px';
	}

	this.setFontFamily = function (fontFamily) {
		this._el.style.fontFamily = fontFamily;
	}

	this.setPosition = function (x, y, width, height) {
		var style = this._el.style;
		style.top = (y - 1) + 'px';
		style.left = x + 'px';
		style.width = width + 'px';
		style.height = height + 'px';
	}
});

var _input = new InputField();
_input.hide();

var _focused = null;

exports = Class(function () {

	var defaults = {
		hint: '',
		inputType: 'default', // default | number | phone | password | capital
		maxLength: -1
	}

	this.init = function (opts) {
		this._opts = merge(opts, defaults);

		this._textEditView = opts.textEditView;
		this.onFocusChange = opts.onFocusChange || function() {};
		this.onSubmit = opts.onSubmit || function () {}
	}

	this.onChange = function (value, prevValue, cursorPos, selectionEnd) {
		this._value = value;
		if (this._opts.onChange) {
			this._opts.onChange(value, prevValue, cursorPos);
		}
	}

	this.getValue = function () {
		return this._value;
	}

	this.setValue = function (value) {
		this._value = value;
		this.onChange(value);
	}

	this.requestFocus = function(noSubmit) {
		if (_focused !== this) {
			if (_focused != null) {
				_focused.removeFocus(noSubmit);
			}

			this.onFocusChange(true);
		}

		_focused = this;
	}

	this.closeEditField = function(noSubmit) {
		console.log("TextEditView editText removeFocus");
		if (_focused != null) {
			_focused.removeFocus(noSubmit);
		}

		this._showTextBox();
		_input.hide();
		// NATIVE.inputPrompt.hideSoftKeyboard();

		if (__keyboardIsOpen) {
			__keyboardIsOpen = false;
			var ev = new Event('keyboardClosed');
			ev.height = device.screen.height;
			window.dispatchEvent(ev);
		}
	 }

	this._hideTextBox = function () {
		var textBox = this._textEditView._textBox;
		textBox.style.visible = false;
	}

	this._showTextBox = function () {
		var textBox = this._textEditView._textBox;
		textBox.style.visible = true;
	}

	this.refresh = function(value, hasBack, hasForward, cursorPos) {

		this._hideTextBox();

		var textBox = this._textEditView._textBox;
		var pos = this._textEditView.getPosition();
		var scale = pos.width / this._textEditView.style.width;

		_input.setCursor(cursorPos);
		_input.setValue(value);
		_input.setPlaceholder(this._opts.hint);
		_input.setMaxLength(this._opts.maxLength);
		_input.setFontColor(this._opts.color);
		_input.setHorizontalPadding(this._opts.paddingLeft * scale, this._opts.paddingRight * scale);
		_input.setFontSize(textBox.getOpts().size * scale);
		_input.setFontFamily(textBox.getOpts().fontFamily)
		_input.setPosition(pos.x, pos.y, pos.width, pos.height);
		_input.show();

		if (!__keyboardIsOpen) {
			__keyboardIsOpen = true;
			var ev = new Event('keyboardOpened');
			ev.height = device.screen.height * .6;
			window.dispatchEvent(ev);
		}

		/*
		if (hasBack) {
			_backButton.onSelect = bind(this, function () {
				this._textEditView.focusPrevious());
			});
			_backButton.disabled = false;
		} else {
			_backButton.disabled = true;
		}

		if (hasForward) {
			_forwardButton.onSelect = bind(this, function () {
				this._textEditView.focusNext());
			});
			_forwardButton.disabled = false;
		} else {
			_forwardButton.disabled = true;
		}

		*/
	}

	this.hasFocus = function() {
		return this == _focused;
	}

	this.removeFocus = function(noSubmit) {
		this.onFocusChange(false);
		if(!noSubmit) {
			this.onSubmit(_input.getValue());
		}
		if (_focused == this) {
			_focused = null;
		}
	}

	this.setHint = function(hint) {
		this._opts.hint = hint;
	}
});
