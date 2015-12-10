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

jsio("import math.geom.Rect as Rect");

describe(
  "math.geom.Rect",
  function() {
    describe(
      "#constructor()",
      function() {
        it(
          "construct a rect",
          function() {
            var rect;

            rect = new Rect();
            assert(rect instanceof Rect, "the rect should be an instance of Rect");
            assert(rect.x === 0, "the x position of the rect should be 0");
            assert(rect.y === 0, "the y position of the rect should be 0");
            assert(rect.width === 0, "the width of the rect should be 0");
            assert(rect.height === 0, "the height of the rect should be 0");

            rect = new Rect({x: 7, y: 8, width: 9, height: 10});
            assert(rect instanceof Rect, "the rect should be an instance of Rect");
            assert(rect.x === 7, "the x position of the rect should be 7");
            assert(rect.y === 8, "the y position of the rect should be 8");
            assert(rect.width === 9, "the width of the rect should be 9");
            assert(rect.height === 10, "the height of the rect should be 10");

            rect = new Rect({x: 33, y: 34}, {x: 1, y: 2});
            assert(rect instanceof Rect, "the rect should be an instance of Rect");
            assert(rect.x === 33, "the x position of the rect should be 33");
            assert(rect.y === 34, "the y position of the rect should be 34");
            assert(rect.width === 1, "the width of the rect should be 1");
            assert(rect.height === 2, "the height of the rect should be 2");

            rect = new Rect({x: 105, y: 106}, 70, 80);
            assert(rect instanceof Rect, "the rect should be an instance of Rect");
            assert(rect.x === 105, "the x position of the rect should be 105");
            assert(rect.y === 106, "the y position of the rect should be 106");
            assert(rect.width === 70, "the width of the rect should be 70");
            assert(rect.height === 80, "the height of the rect should be 80");

            rect = new Rect(9, 8, 7, 6);
            assert(rect instanceof Rect, "the rect should be an instance of Rect");
            assert(rect.x === 9, "the x position of the rect should be 9");
            assert(rect.y === 8, "the y position of the rect should be 8");
            assert(rect.width === 7, "the width of the rect should be 7");
            assert(rect.height === 6, "the height of the rect should be 6");
          }
        );
      }
    );

    describe(
      "#normalize()",
      function() {
        it(
          "normalize negative height and width dimensions by adjusting the position of the rect",
          function() {
            var rect = new Rect({x: 4, y: 3, width: -9, height: -10}).normalize();

            assert(rect.x === 13, "the x position of the rect should be 13");
            assert(rect.y === 13, "the y position of the rect should be 13");
            assert(rect.width === 9, "the width of the rect should be 9");
            assert(rect.height === 10, "the height of the rect should be 10");
          }
        );
      }
    );

    describe(
      "#intersectRect()",
      function() {
        it(
          "generate the intersection of a rectange with another rectangle",
          function() {
            var rect1;
            var rect2;

            rect1 = new Rect(2, 3, 4, 5);
            rect2 = new Rect(3, 4, 5, 6);
            rect1.intersectRect(rect2);

            assert(rect1.x === 3, "the x position of the rect should be 3");
            assert(rect1.y === 4, "the y position of the rect should be 4");
            assert(rect1.width === 3, "the width of the rect should be 3");
            assert(rect1.height === 4, "the height of the rect should be 4");

            rect1 = new Rect(2, 3, 4, 5);
            rect2 = new Rect(13, 14, 5, 6);
            rect1.intersectRect(rect2);

            assert(rect1.width === 0, "the width of the rect should be 0");
            assert(rect1.height === 0, "the height of the rect should be 0");
          }
        );
      }
    );

    describe(
      "#unionRect(rect)",
      function() {
        it(
          "generate the union of a rectange with another rectangle",
          function() {
            var rect1;
            var rect2;

            rect1 = new Rect(7, 8, 9, 10);
            rect2 = new Rect(1, 2, 3, 4);
            rect1.unionRect(rect2);

            assert(rect1.x === 1, "the x position of the rect should be 1");
            assert(rect1.y === 2, "the y position of the rect should be 2");
            assert(rect1.width === 15, "the width of the rect should be 15");
            assert(rect1.height === 16, "the height of the rect should be 16");
          }
        );
      }
    );

    describe(
      "#getCorner(i)",
      function() {
        it(
          "get a point for the given corner",
          function() {
            var rect = new Rect(3, 7, 4, 8);
            var point;

            point = rect.getCorner(Rect.CORNERS.TOP_LEFT);
            assert(point.x === 3, "the x position of the top left point should be 3");
            assert(point.y === 7, "the y position of the top left point should be 7");

            point = rect.getCorner(Rect.CORNERS.TOP_RIGHT);
            assert(point.x === 7, "the x position of the top right point should be 7");
            assert(point.y === 7, "the y position of the top right point should be 7");

            point = rect.getCorner(Rect.CORNERS.BOTTOM_RIGHT);
            assert(point.x === 7, "the x position of the bottom right point should be 7");
            assert(point.y === 15, "the y position of the bottom right point should be 15");

            point = rect.getCorner(Rect.CORNERS.BOTTOM_LEFT);
            assert(point.x === 3, "the x position of the bottom left point should be 3");
            assert(point.y === 15, "the y position of the bottom left point should be 15");
          }
        );
      }
    );

    describe(
      "#getSide(i)",
      function() {
        it(
          "return a line corresponding to the given side",
          function() {
            var rect = new Rect(3, 7, 2, 4);
            var line;

            line = rect.getSide(Rect.SIDES.TOP);
            assert(line.start.x === 3, "the start x position of the top side should be 3");
            assert(line.start.y === 7, "the start y position of the top side should be 7");
            assert(line.end.x === 5, "the end x position of the top side should be 5");
            assert(line.end.y === 7, "the end y position of the top side should be 7");

            line = rect.getSide(Rect.SIDES.RIGHT);
            assert(line.start.x === 5, "the start x position of the right side should be 5");
            assert(line.start.y === 7, "the start y position of the right side should be 7");
            assert(line.end.x === 5, "the end x position of the right side should be 5");
            assert(line.end.y === 11, "the end y position of the right side should be 11");

            line = rect.getSide(Rect.SIDES.BOTTOM);
            assert(line.start.x === 5, "the start x position of the bottom side should be 5");
            assert(line.start.y === 11, "the start y position of the bottom side should be 11");
            assert(line.end.x === 3, "the end x position of the bottom side should be 3");
            assert(line.end.y === 11, "the end y position of the bottom side should be 11");

            line = rect.getSide(Rect.SIDES.LEFT);
            assert(line.start.x === 3, "the start x position of the left side should be 3");
            assert(line.start.y === 11, "the start y position of the left side should be 11");
            assert(line.end.x === 3, "the end x position of the bottom side should be 3");
            assert(line.end.y === 7, "the end y position of the bottom side should be 7");
          }
        );
      }
    );

    describe(
      "#getCenter()",
      function() {
        it(
          "return a line corresponding to the given side",
          function() {
            var rect = new Rect(3, 7, 6, 10);
            var point;

            point = rect.getCenter();
            assert(point.x === 6, "the center x position of the rect should be 6");
            assert(point.y === 12, "the center y position of the rect should be 12");
          }
        );
      }
    );
  }
);