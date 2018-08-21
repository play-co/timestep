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

jsio("import math.geom.Vec2D as Vec2D");

describe(
  "math.geom.Vec2D",
  function() {
    describe(
      "#constructor()",
      function() {
        it(
          "construct a vector",
          function() {
            var vec2D;

            vec2D = new Vec2D({x: 11, y: 12});
            assert(vec2D.x === 11, "the x value of the vector should be 11");
            assert(vec2D.y === 12, "the y value of the vector should be 12");

            vec2D = new Vec2D({magnitude: Math.sqrt(2), angle: Math.PI / 4});
            assert(Math.round(vec2D.x) === 1, "the x value of the vector should be 1");
            assert(Math.round(vec2D.y) === 1, "the y value of the vector should be 1");
          }
        );
      }
    );

    describe(
      "#addForce(f)",
      function() {
        it(
          "add a force vector to this vector",
          function() {
            var vec2D;

            vec2D = new Vec2D({x: 11, y: 12});
            vec2D.addForce(new Vec2D({x: 3, y: 4}));

            assert(vec2D.x === 14, "the x value of the vector should be 14");
            assert(vec2D.y === 16, "the y value of the vector should be 16");
          }
        );
      }
    );

    describe(
      "#getAngle()",
      function() {
        it(
          "return the angle of this vector",
          function() {
            var vec2D;

            vec2D = new Vec2D({x: 1, y: 1});
            assert(
              Math.round(vec2D.getAngle() * 10000) === Math.round(Math.PI / 4 * 10000),
              "the angle should be Math.PI / 4"
            );
          }
        );
      }
    );

    describe(
      "#getMagnitude()",
      function() {
        it(
          "get the magnitude of a vector",
          function() {
            var vec2D;

            vec2D = new Vec2D({x: 3, y: 4});
            assert(vec2D.getMagnitude() === 5, "the magnitude should be 5");
          }
        );
      }
    );

    describe(
      "#getUnitVector()",
      function() {
        it(
          "get a unit vector corresponding to this vector's angle",
          function() {
            var vec2D;

            vec2D = new Vec2D({x: 5, y: 5});
            vec2D = vec2D.getUnitVector();
            assert(
              Math.round((vec2D.x * vec2D.x + vec2D.y * vec2D.y) * 100000) === 100000,
              "the unit vector should be (0.7071..., 0.7071...)"
            );
          }
        );
      }
    );

    describe(
      "#dot(vec)",
      function() {
        it(
          "return the dot product of this and another vector",
          function() {
            var vec1;
            var vec2;

            vec1 = new Vec2D(new Vec2D({x: 3, y: 5}));
            assert(vec1.dot({x: 2, y: 4}) === 26, "the dot product should be 26");
          }
        );
      }
    );

    describe(
      "#add(vec)",
      function() {
        it(
          "returns a vector that is the addition of this and another vector",
          function() {
            var vec1;
            var vec2;

            vec1 = new Vec2D({x: 2, y: 7});
            vec2 = vec1.add(new Vec2D({x: 3, y: 8}));

            assert(vec2.x, "the x value of the vector should be 5");
            assert(vec2.y, "the y value of the vector should be 15");
          }
        );
      }
    );

    describe(
      "#minus(vec)",
      function() {
        it(
          "returns a vector that is this vector subtracted by another",
          function() {
            var vec1;
            var vec2;

            vec1 = new Vec2D({x: 2, y: 7});
            vec2 = vec1.minus(new Vec2D({x: 3, y: 10}));

            assert(vec2.x, "the x value of the vector should be -1");
            assert(vec2.y, "the y value of the vector should be -3");
          }
        );
      }
    );

    describe(
      "#negate()",
      function() {
        it(
          "returns a vector that would negate this vector when added",
          function() {
            var vec2D;

            vec2D = new Vec2D({x: 2, y: -9});
            vec2D = vec2D.negate();

            assert(vec2D.x, "the x value of the vector should be -2");
            assert(vec2D.y, "the y value of the vector should be 9");
          }
        );
      }
    );

    describe(
      "#multiply(scalar)",
      function() {
        it(
          "returns a vector that multiplies this vector's magnitude by a scalar",
          function() {
            var vec2D;

            vec2D = new Vec2D({x: 4, y: 5});
            vec2D = vec2D.multiply(2);

            assert(Math.round(vec2D.x), "the x value of the vector should be 8");
            assert(Math.round(vec2D.y), "the y value of the vector should be 10");
          }
        );
      }
    );
  }
);