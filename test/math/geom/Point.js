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

jsio("import math.geom.Point as Point");

describe(
  "math.geom.Point",
  function() {
    describe(
      "#constructor()",
      function() {
        it(
          "construct a point",
          function() {
            var point = new Point(39, 40);

            assert(point instanceof Point, "the point should be an instance of Point");
            assert(point.x === 39, "the x value of the point should be 39");
            assert(point.y === 40, "the y value of the point should be 40");
          }
        );
      }
    );

    describe(
      "#rotate(r)",
      function() {
        it(
          "rotate a point",
          function() {
            var point = new Point(39, 40).rotate(Math.PI);

            assert(Math.round(point.x) === -39, "the x value of the point should be -39");
            assert(Math.round(point.y) === -40, "the y value of the point should be -40");
          }
        );
      }
    );

    describe(
      "#translate(x, y)",
      function() {
        it(
          "translate a point",
          function() {
            var point = new Point(39, 40).translate(-10, -12);

            assert(point.x === 29, "the x value of the point should be 29");
            assert(point.y === 28, "the y value of the point should be 28");
          }
        );
      }
    );

    describe(
      "#substract(x, y)",
      function() {
        it(
          "subtract a number from a point",
          function() {
            var point = new Point(39, 40).subtract(11, 13);

            assert(point.x === 28, "the x value of the point should be 28");
            assert(point.y === 27, "the y value of the point should be 27");
          }
        );
      }
    );

    describe(
      "#scale(s)",
      function() {
        it(
          "scale the values of a point",
          function() {
            var point = new Point(12, 23).scale(2);

            assert(point.x === 24, "the x value of the point should be 24");
            assert(point.y === 46, "the y value of the point should be 46");
          }
        );
      }
    );

    describe(
      "#setMagnitude(m)",
      function() {
        it(
          "set the magnitude of a point",
          function() {
            var point;

            point = new Point(1, 0).setMagnitude(2);
            assert(Math.round(point.x) === 2, "the x value of the point should be 2");
            assert(Math.round(point.y) === 0, "the y value of the point should be 0");

            point = new Point(0, 1).setMagnitude(2);
            assert(Math.round(point.x) === 0, "the x value of the point should be 0");
            assert(Math.round(point.y) === 2, "the y value of the point should be 2");
          }
        );
      }
    );

    describe(
      "#normalize()",
      function() {
        it(
          "normalize a point",
          function() {
            var point;

            point = new Point(10, 0).normalize(2);
            assert(Math.round(point.x) === 1, "the x value of the point should be 1");
            assert(Math.round(point.y) === 0, "the y value of the point should be 0");

            point = new Point(0, 10).normalize(2);
            assert(Math.round(point.x) === 0, "the x value of the point should be 0");
            assert(Math.round(point.y) === 1, "the y value of the point should be 1");
          }
        );
      }
    );

    describe(
      "#addMagnitude(m)",
      function() {
        it(
          "add magnitude to this point",
          function() {
            var point;

            point = new Point(1, 0).addMagnitude(2);
            assert(Math.round(point.x) === 3, "the x value of the point should be 3");
            assert(Math.round(point.y) === 0, "the y value of the point should be 0");
            point = new Point(0, 1).addMagnitude(2);
            assert(Math.round(point.x) === 0, "the x value of the point should be 0");
            assert(Math.round(point.y) === 3, "the y value of the point should be 3");
          }
        );
      }
    );

    describe(
      "#getMagnitude()",
      function() {
        it(
          "get the magnitude of a point",
          function() {
            var m = new Point(3, 4).getMagnitude();

            assert(Math.round(m) === 5, "the magnitude should be 5");
          }
        );
      }
    );

    describe(
      "#getSquaredMagnitude()",
      function() {
        it(
          "get the squared magnitude of a point",
          function() {
            var m = new Point(3, 4).getSquaredMagnitude();

            assert(m === 25, "the squared magnitude should be 25");
          }
        );
      }
    );

    describe(
      "#getDirection()",
      function() {
        it(
          "get the direction of a point",
          function() {
            var d = new Point(5, 5).getDirection();

            assert(Math.round(d * (180 / Math.PI)) === 45, "the derection should be 45 degrees");
          }
        );
      }
    );
  }
);