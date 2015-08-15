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
 * package timestep.env.browser.InputPrompt;
 *
 * Prompt the user manually for input.
 */

import device;
from util.browser import $;
import ...ui.keyboardTypes as keyboardTypes;
import .dom;

exports.show = function (controller, opts) {
  new InputDialog(controller, opts);
};

var css = {
  classes: {
    base: 'timestep-native-dialog',
    dialog: 'dialog',
    title: 'title',
    hasMessage: 'has-message',
    message: 'message',
    buttons: 'buttons',
    input: 'input'
  },
  getStylesheet: function () {
    var prefix = dom.getCSSPrefix();
    return new dom.Stylesheet('.' + this.classes.base)
      .add('', 'position: absolute; width: 100%; height: 100%; top: 0px; left: 0px; z-index: 9999999; background: rgba(0, 0, 0, 0.5);')
      .add('*', prefix + 'box-sizing: border-box; font: 12px Helvetica')
      .add('.' + this.classes.dialog, 'position: absolute; color: #444; background: rgba(255, 255, 255, 0.93); border-radius: 5px; text-align: left; ' + prefix + 'box-shadow: 0px 3px 40px rgba(0, 0, 0, 0.2)')
      .add('.' + this.classes.hasMessage, 'margin-bottom: 16px')
      .add('.' + this.classes.title, 'padding: 16px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap')
      .add('.' + this.classes.message, 'padding: 0px 16px; color: #888')
      .add('.' + this.classes.buttons, 'margin: 16px 0px 0px 0px; height: 34px; border-top: 1px solid #CCC')
      .add('.' + this.classes.input, 'padding: 0px 8px')
      .add('button', 'position: relative; border: 0px; margin: 0px; width: 50%; height: 100%; cursor: pointer; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-weight: bold; background: transparent; outline: none')
      .add('button:active', 'background: #FFF')
      .add('button:first-child', 'border-bottom-left-radius: 5px')
      .add('button:last-child', 'border-bottom-right-radius: 5px')
      .add('button:only-child', 'width: 100%; border-bottom-right-radius: 5px')
      .add('button:nth-child(2):before', 'content:""; position: absolute; left: 0px; top: 0px; width: 1px; height: 100%; border-left: 1px solid #CCC')
      .add('input', 'margin: 0px; border: 1px solid #ccc; padding: 4px 8px; text-align: left; width: 100%');
  },
  sizeAndPositionDialog: function (dialog, contents) {
    var scale = device.devicePixelRatio;
    var windowSize = $.size(window);
    contents.style.overflow = 'auto';
    contents.style.maxHeight = Math.min(200 * scale, Math.floor(windowSize.height / 3)) + 'px';
    dialog.style.maxWidth = Math.min(300 * scale, Math.floor(windowSize.width - 40)) + 'px';
    dialog.style.left = Math.max(0, (windowSize.width - dialog.offsetWidth) / 2) + 'px';
    dialog.style.top = Math.max(0, (windowSize.height - dialog.offsetHeight) / 2) + 'px';
  }
};

var dialogStylesheet;

var InputDialog = Class(function () {
  this.init = function (controller, opts) {

    var addClasses = opts.defaultBrowserStyles;
    if (!dialogStylesheet && addClasses) {
      dialogStylesheet = css.getStylesheet()
        .scale(device.devicePixelRatio)
        .insert();
    }

    // at least one button must be visible
    if (!opts.okText && !opts.cancelText) {
      opts.okText = 'ok';
    }

    // create buttons
    this._buttons = [];

    if (opts.cancelText) {
      this._createButton(opts.cancelText, opts.onCancel);
    }

    if (opts.okText) {
      this._createButton(opts.okText, opts.onSubmit);
    }

    if (opts.isPassword) { opts.keyboardType = 'password'; }
    this._createInputField(opts.value, opts.keyboardType, opts.onChange);

    // create dialog
    var body = $({
        className: opts.message && addClasses && css.classes.hasMessage,
        children: [
          {
            className: addClasses && css.classes.title,
            text: opts.title
          }, {
            className: opts.message && addClasses && css.classes.message,
            text: opts.message
          }
        ]
      });

    var dialog = $({
        className: addClasses && css.classes.dialog,
        children: [body, {
          className: addClasses && css.classes.input,
          children: [this._input]
        }, {
          className: addClasses && css.classes.buttons,
          children: this._buttons
        }]
      });

    this._el = $({
        parent: document.body,
        className: addClasses && css.classes.base,
        children: [dialog]
      });

    $.onEvent(this._el, device.events.move, function (e) {
      var target = e.target;
      while (target && target != document.body)  {
        if (target == dialog) { return; }
        target = target.parentNode;
      }

      e.preventDefault();
    });

    if (addClasses) {
      css.sizeAndPositionDialog(dialog, body);
    }

    if (opts.autoFocus) {
      this._input.focus();
    }

    if (opts.onShow) {
      opts.onShow(dialog);
    }
  };

  this.close = function () {
    $.remove(this._el);
  };

  this._createButton = function (text, cb) {
    var btn = $({
          tag: 'button',
          text: text,
          attrs: {noCapture: true}
        });

    $.onEvent(btn, device.events.end, function () {
      this.close();
      if (cb) {
        cb && cb(this.getValue());
      }
    }.bind(this));

    this._buttons.push(btn);
  };

  this._createInputField = function (value, type, cb) {
    var input = $({
        tag: 'input',
        value: value,
        attrs: {
          noCapture: true,
          type: keyboardTypes.getHTMLType(type)
        }
      });

    if (cb) {
      if (value === undefined) { value = ''; }

      var listener = function (evt) {
        var _value = this.getValue();
        if (value !== _value) {
          value = _value;

          cb(_value, evt);
        }
      }.bind(this);

      $.onEvent(input, 'keyup', listener);
      $.onEvent(input, 'change', listener);
    }

    this._input = input;
  };

  this.getValue = function () {
    return this._input && this._input.value;
  };
});
