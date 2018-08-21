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
/**
 * @class ui.TextPromptView;
 * Implements a view that can accept input using the environment's InputPrompt.
 *
 * @doc http://doc.gameclosure.com/api/ui-text.html#class-ui.textpromptview
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/text.md
 */
import {
  merge,
  bind
} from 'base';

import TextView from 'ui/TextView';
import InputPrompt from 'platforms/browser/InputPrompt';

var defaults = {
  prompt: '',
  autoShowKeyboard: true,
  isPassword: false
};

export default class TextPromptView extends TextView {
  constructor (opts) {
    opts = merge(opts, defaults);
    super(opts);

    this._prompt = new InputPrompt({
      prompt: this._opts.prompt,
      autoShowKeyboard: this._opts.autoShowKeyboard,
      isPassword: this._opts.isPassword,
      onChange: bind(this, 'onChange'),
      onSubmit: bind(this, 'onSubmit'),
      keyboardType: this._opts.keyboardType
    });
  }
  onInputSelect () {
    this._prompt.show();
  }
  onSubmit (value) {
    this.publish('Submit', value);
  }
  onChange (changeValue) {
    if (changeValue === null) {
      this.publish('Cancel');
    } else {
      var value = this._prompt.getValue();
      if (value !== this.getText()) {
        this.setText(value);
        this.publish('Change', value);
      }
    }
  }
  setOkButton (value) {
    this._prompt.setOkButton(value);
    return this;
  }
  setCancelButton (value) {
    this._prompt.setCancelButton(value);
    return this;
  }
  setPrompt (prompt) {
    this._prompt.setMessage(prompt);
    return this;
  }
  showPrompt () {
    this._prompt.show();
  }
  setKeyboardType (keyboardType) {
    this._prompt.setKeyboardType(keyboardType);
    return this;
  }
}

TextPromptView.KeyboardTypes = InputPrompt.KeyboardTypes;
