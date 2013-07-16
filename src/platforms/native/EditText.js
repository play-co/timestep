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
var focused;

NATIVE.InputPrompt.subscribe('KeyUp', function(evt) {
	if (focused != null) {
        focused.onChange(evt.text);    
    }
});

NATIVE.InputPrompt.subscribe('Move', function(evt) {
    if (evt.next && focused && focused._textEditView && focused._textEditView._forwardTextEditView) {
        focused._textEditView._forwardTextEditView.requestFocus();
    } else if (!evt.next && focused && focused._textEditView && focused._textEditView._backTextEditView) {
        focused._textEditView._backTextEditView.requestFocus();
    }
});

exports = Class(function() {

    var defaults = {
        hint: '',
        inputType: 'default', // default | number | phone | password | capital
        maxLength: -1
    }

    this.init = function(opts) {
        console.log('instantiate EditText with hint: ' + opts.hint);
        this._opts = merge(opts, defaults);
        this._textEditView = opts.textEditView;
        this.onChange = opts.onChange;
        this.onFocusChange = opts.onFocusChange || function() {};
    };

    this.requestFocus = function() {
        if (focused !== this) {
            if (focused != null) focused.removeFocus(); 
            this.onFocusChange(true);
        }

        focused = this; 
    }

    this.closeEditField = function() {
        console.log("TextEditView editText removeFocus");
        NATIVE.inputPrompt.hideSoftKeyboard(); 
     }

    this.refresh = function(currentVal, hasBack, hasForward) {
        console.log("TextEditView refresh with: " + currentVal);
        NATIVE.inputPrompt.showSoftKeyboard(currentVal || "", 
                                            this._opts.hint, 
                                            hasBack, 
                                            hasForward, 
                                            this._opts.inputType, 
                                            this._opts.maxLength);
    }

    this.hasFocus = function() {
        return focused = this; 
    }

    this.removeFocus = function() {
        this.onFocusChange(false); 
    }

});
