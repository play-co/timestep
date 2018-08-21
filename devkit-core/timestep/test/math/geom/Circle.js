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

jsio("import math.geom.Circle as Circle");

describe(
  "math.geom.Circle",
  function() {
    describe(
      "#constructor()",
      function() {
        it(
          "construct a circle",
          function() {
            var circle;

            circle = new Circle();
            assert(circle instanceof Circle, "the line should be an instance of Circle");
            assert(circle.x === 0, "the x position of the circle should be 0");
            assert(circle.y === 0, "the y position of the circle should be 0");
            assert(circle.radius === 0, "the radius of the circle should be 0");

            circle = new Circle({x: 108, y: 109, radius: 13});
            assert(circle instanceof Circle, "the line should be an instance of Circle");
            assert(circle.x === 108, "the x position of the circle should be 108");
            assert(circle.y === 109, "the y position of the circle should be 109");
            assert(circle.radius === 13, "the radius of the circle should be 13");

            circle = new Circle(78, 79, 27);
            assert(circle instanceof Circle, "the line should be an instance of Circle");
            assert(circle.x === 78, "the x position of the circle should be 108");
            assert(circle.y === 79, "the y position of the circle should be 109");
            assert(circle.radius === 27, "the radius of the circle should be 13");
          }
        );
      }
    );

    describe(
      "#scale(s)",
      function() {
        it(
          "scale the radius of the circle",
          function() {
            assert(new Circle(1, 2, 6).scale(2).radius === 12, "the radius of the circle should be 12");
          }
        );
      }
    );
  }
);