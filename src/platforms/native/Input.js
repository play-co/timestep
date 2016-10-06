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

import event.input.InputEvent as InputEvent;

exports = Class(function () {
  this.getEvents = function () {
    if (NATIVE.timestep && NATIVE.timestep.getEvents) {
      return NATIVE.timestep.getEvents();
    } else {
      var raw = NATIVE.input.getTouchEvents(), evts = [];
      var j = 0;
      for(var i = 0, e; e = raw[i]; ++i) {
        evts[j++] = new InputEvent(e.id, e.type, e.pt);
        if (e.type == 'input:select') {
          evts[j++] = new InputEvent(e.id, 'input:clear', e.pt.x, e.pt.y);
        }
      }
      return evts;
    }
  }
});

if (
  NATIVE.timestep &&
  NATIVE.timestep.getEvents &&
  !NATIVE.timestep.InputEvent
) {
  NATIVE.timestep.InputEvent = InputEvent;
}
