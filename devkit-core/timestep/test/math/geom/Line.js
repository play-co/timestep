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

jsio("import math.geom.Line as Line");

describe(
  "math.geom.Line",
  function() {
    describe(
      "#constructor()",
      function() {
        it(
          "construct a line",
          function() {
            var line;

            line = new Line();
            assert(line instanceof Line, "the line should be an instance of Line");
            assert(line.start, "there should be a start point");
            assert(line.end, "there should be an end point");

            line = new Line(5, 6, 7, 8);
            assert(line instanceof Line, "the line should be an instance of Line");
            assert(line.start.x === 5, "the start.x value should be 5");
            assert(line.start.y === 6, "the start.x value should be 6");
            assert(line.end.x === 7, "the start.x value should be 7");
            assert(line.end.y === 8, "the start.x value should be 8");

            line = new Line(new Point(12, 13), new Point(14, 15));
            assert(line instanceof Line, "the line should be an instance of Line");
            assert(line.start.x === 12, "the start.x value should be 12");
            assert(line.start.y === 13, "the start.x value should be 13");
            assert(line.end.x === 14, "the start.x value should be 14");
            assert(line.end.y === 15, "the start.x value should be 15");

            line = new Line(new Point(44, 45), 46, 47);
            assert(line instanceof Line, "the line should be an instance of Line");
            assert(line.start.x === 44, "the start.x value should be 44");
            assert(line.start.y === 45, "the start.x value should be 45");
            assert(line.end.x === 46, "the start.x value should be 46");
            assert(line.end.y === 47, "the start.x value should be 47");
          }
        );
      }
    );

    describe(
      "#getMagnitude()",
      function() {
        it(
          "get the magnitude of the line",
          function() {
            assert(Math.round(new Line(2, 3, 5, 7).getLength()) === 5, "the length of the line should be 5");
          }
        );
      }
    );
  }
);