/* @license
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

jsio("import event.input.InputEvent as InputEvent");
jsio("import math.geom.Point as Point");

describe(
  "lib.event.input.InputEvent",
  function() {
    describe(
      "#constructor(id, evtType, x, y, root, target)",
      function() {
        it(
          "creates an input event",
          function() {
            var inputEvent = new InputEvent(10, "Click", 34, 39, "root", "target");

            assert(inputEvent.id === 10, "the id should be 10");
            assert(inputEvent.type === "Click", "the type should be \"Click\"");
            assert(inputEvent.point, "there should be a point");
            assert(inputEvent.srcPoint instanceof Point, "there should be a source point");
            assert(inputEvent.srcPoint.x === 34, "the x value of the point should be 34");
            assert(inputEvent.srcPoint.y === 39, "the y value of the point should be 39");
            assert(inputEvent.root === "root", "the root should be \"root\"");
            assert(inputEvent.target === "target", "the target should be \"target\"");
          }
        );
      }
    );

    describe(
      "#cancel()",
      function() {
        it(
          "cancel the event",
          function() {
            var inputEvent = new InputEvent(10, "Click", 34, 39, "root", "target");

            inputEvent.cancel();
            assert(inputEvent.cancelled, "the event should be cancelled");
          }
        );
      }
    );

    describe(
      "#clone()",
      function() {
        it(
          "clone the event",
          function() {
            var inputEvent = new InputEvent(10, "Click", 34, 39, "root", "target");
            var clonedEvent = inputEvent.clone();

            assert(clonedEvent !== inputEvent, "the events should not be instance");
            assert(inputEvent.id === clonedEvent.id, "the id should be the same");
            assert(inputEvent.type === clonedEvent.type, "the type should be the same");
            assert(clonedEvent.point, "there should be a point");
            assert(clonedEvent.srcPoint instanceof Point, "there should be a source point");
            assert(inputEvent.srcPoint.x === clonedEvent.srcPoint.x, "the x value of the point should be the same");
            assert(inputEvent.srcPoint.y === clonedEvent.srcPoint.y, "the y value of the point should be the same");
            assert(inputEvent.root === clonedEvent.root, "the root should be the same");
            assert(inputEvent.target === clonedEvent.target, "the target should be the same");
          }
        );
      }
    );
  }
);