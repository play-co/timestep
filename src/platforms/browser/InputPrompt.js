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

from util.browser import $;
import ..ui.keyboardTypes as keyboardTypes;

var BASE_CLASS = 'timestep-native-dialog';
var TITLE_CLASS = 'title';
var MESSAGE_CLASS = 'message';
var BUTTONS_CLASS = 'buttons';
var DEFAULT_STYLES = [
  '.' + BASE_CLASS + ' { position: absolute; z-index: 9999999; font: 12px Helvetica; color: #444; background: rgba(255, 255, 255, 0.9); border-radius: 5px; text-align: left; }',
  '.' + BASE_CLASS + ' .' + TITLE_CLASS + '{ padding: 10px; font-weight: bold; }',
  '.' + BASE_CLASS + ' .' + MESSAGE_CLASS + '{ padding: 10px; color: #888; }',
  '.' + BASE_CLASS + ' .' + BUTTONS_CLASS + '{ padding: 10px; text-align: right; }',
].join('');

var addedStyles = false;
exports.show = function (controller, opts) {
  var addClasses = opts.defaultBrowserStyles;

  // initialize default styles
  if (addClasses && !addedStyles) {
    $({
      parent: document.getElementsByTagName('head')[0],
      tag: 'style',
      text: DEFAULT_STYLES
    });
  }

  // create buttons
  var buttons = [];
  var okButton;
  var cancelButton;
  if (opts.okText) {
    okButton = $({
        type: 'button',
        text: opts.okText,
        attrs: {noCapture: true}
      });
    buttons.push(okButton);
    if (opts.onSubmit) {
      $.onEvent(okButton, 'click', opts.onSubmit);
    }
  }

  if (opts.cancelText) {
    cancelButton = $({
        type: 'button',
        text: opts.cancelText,
        attrs: {noCapture: true}
      });
    buttons.push(cancelButton);
    if (opts.onCancel) {
      $.onEvent(okButton, 'click', opts.onCancel);
    }
  }

  // create input element
  var input = $({
      tag: 'input',
      attrs: {
        noCapture: true,
        type: opts.isPassword ? 'password' : keyboardTypes.getHTMLType('text')
      }
    });

  if (opts.onChange) {
    $.onEvent(input, 'change', opts.onChange);
  }

  // create dialog
  var dialog = $({
    parent: document.body,
    className: addClasses && BASE_CLASS,
    children: [{
      className: addClasses && TITLE_CLASS,
      text: opts.title
    }, {
      className: addClasses && MESSAGE_CLASS,
      text: opts.message
    }, input,
    {
      className: addClasses && BUTTONS_CLASS,
      children: buttons
    }]
  });

  if (addClasses) {
    var windowSize = $.size(window);
    $.style(dialog, {
      left: (windowSize.width - dialog.offsetWidth) / 2,
      top: (windowSize.height - dialog.offsetHeight) / 2,
    });
  }

  if (opts.onShow) {
    opts.onShow(dialog);
  }
};
