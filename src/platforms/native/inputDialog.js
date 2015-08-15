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

 /* globals NATIVE */

import ...ui.keyboardTypes;

var _controllers = {};

NATIVE.input.subscribe('InputPromptSubmit', function (evt) {
  var controller = _controllers[evt.id];
  if (controller) {
    controller.setValue(evt.text);
    controller.onChange && controller.onChange(evt.text);
    controller.onSubmit && controller.onSubmit(evt.text);
    delete _controllers[evt.id];
  } else {
    logger.warn('Dropping InputPrompt event: ' + JSON.stringify(evt));
  }
});

NATIVE.input.subscribe('Cancel', function (evt) {
  var controller = _controllers[evt.id];
  if (controller) {
    controller.onChange && controller.onChange(controller.getValue());
    delete _controllers[evt.id];
  } else {
    logger.warn('Dropping InputPrompt event: ' + JSON.stringify(evt));
  }
});

exports.show = function (controller, opts) {
  var id = NATIVE.input.openPrompt(
      '' + opts.title,
      '' + opts.message,
      '' + opts.okText,
      '' + opts.cancelText,
      '' + opts.value,
      !!opts.autoFocus,
      !!opts.isPassword,
      ui.keyboardTypes.getNativeType(opts.keyboardType));

  _controllers[id] = controller;
};
