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

jsio("import math.geom.intersect as intersect");
jsio("import math.geom.Point as Point");
jsio("import math.geom.Rect as Rect");
jsio("import math.geom.Circle as Circle");

describe(
  "math.geom.intersect",
  function() {
    describe(
      "#pointAndRect(pt, rect)",
      function() {
        it(
          "check if a point falls within a rectangle",
          function() {
            var rect = new Rect(-3, -5, 10, 11);

            assert(intersect.pointAndRect(new Point(1, 2), rect), "the point is inside the rectangle");
            assert(!intersect.pointAndRect(new Point(-4, 3), rect), "the point is outside the rectangle");
          }
        );
      }
    );

    describe(
      "#rectAndPoint(pt, rect)",
      function() {
        it(
          "check if a point falls within a rectangle",
          function() {
            var rect = new Rect(-3, -5, 10, 11);

            assert(intersect.rectAndPoint(rect, new Point(1, 2)), "the point is inside the rectangle");
            assert(!intersect.rectAndPoint(rect, new Point(-4, 3)), "the point is outside the rectangle");
          }
        );
      }
    );

    describe(
      "#pointAndCircle(pt, circ)",
      function() {
        it(
          "check if a point falls within a circle",
          function() {
            var circle = new Circle(2, 4, 3);

            assert(!intersect.pointAndCircle(new Point(-2, 2), circle), "the point is outside the circle");
            assert(intersect.pointAndCircle(new Point(1, 2), circle), "the point is inside the circle");
          }
        );
      }
    );

    describe(
      "#circleAndPoint(pt, circ)",
      function() {
        it(
          "check if a point falls within a circle",
          function() {
            var circle = new Circle(2, 4, 3);

            assert(!intersect.circleAndPoint(circle, new Point(-2, 2)), "the point is outside the circle");
            assert(intersect.circleAndPoint(circle, new Point(1, 2)), "the point is inside the circle");
          }
        );
      }
    );

    describe(
      "#isRectAndRect(rect1, rect2)",
      function() {
        it(
          "check if two rectangles intersect",
          function() {
            var rect1;
            var rect2;

            rect1 = new Rect(1, 2, 3, 4);
            rect2 = new Rect(2, 3, 4, 5);
            assert(intersect.isRectAndRect(rect1, rect2), "the rectangles should intersect");

            rect1 = new Rect(1, 2, 7, 8);
            rect2 = new Rect(2, 3, 1, 2);
            assert(intersect.isRectAndRect(rect1, rect2), "the rectangles should intersect");

            rect1 = new Rect(1, 2, 7, 8);
            rect2 = new Rect(-2, -3, 1, 2);
            assert(!intersect.isRectAndRect(rect1, rect2), "the rectangles should not intersect");
          }
        );
      }
    );

    describe(
      "#circleAndRect(circle, rect)",
      function() {
        it(
          "check if a circle and a rectangle intersect",
          function() {
            var circle;
            var rect;

            circle = new Circle(4, 5, 3);
            rect = new Rect(1, 2, 10, 11);
            assert(intersect.circleAndRect(circle, rect), "the circle and rectangles should intersect");

            circle = new Circle(0, 5, 3);
            rect = new Rect(1, 2, 10, 11);
            assert(intersect.circleAndRect(circle, rect), "the circle and rectangles should intersect");

            circle = new Circle(-3, 5, 3);
            rect = new Rect(1, 2, 10, 11);
            assert(!intersect.circleAndRect(circle, rect), "the circle and rectangles should not intersect");
          }
        );
      }
    );

    describe(
      "#rectAndCircle(rect, circle)",
      function() {
        it(
          "check if a rectangle and a circle intersect",
          function() {
            var circle;
            var rect;

            circle = new Circle(4, 5, 3);
            rect = new Rect(1, 2, 10, 11);
            assert(intersect.rectAndCircle(rect, circle), "the circle and rectangles should intersect");

            circle = new Circle(0, 5, 3);
            rect = new Rect(1, 2, 10, 11);
            assert(intersect.rectAndCircle(rect, circle), "the circle and rectangles should intersect");

            circle = new Circle(-3, 5, 3);
            rect = new Rect(1, 2, 10, 11);
            assert(!intersect.rectAndCircle(rect, circle), "the circle and rectangles should not intersect");
          }
        );
      }
    );

    describe(
      "#lineAndCircle(line, circle)",
      function() {
        it(
          "check if a line and a circle intersect",
          function() {
            var circle;
            var line;

            circle = new Circle(4, 5, 3);
            line = new Line(0, 3, 10, 1);
            assert(intersect.lineAndCircle(line, circle), "the line and circle should intersect");

            circle = new Circle(4, 5, 3);
            line = new Line(0, 3, 1, 10);
            assert(!intersect.lineAndCircle(line, circle), "the line and circle should not intersect");
          }
        );
      }
    );

    describe(
      "#circleAndLine(line, circle)",
      function() {
        it(
          "check if a circle and a line intersect",
          function() {
            var circle;
            var line;

            circle = new Circle(4, 5, 3);
            line = new Line(0, 3, 10, 1);
            assert(intersect.circleAndLine(circle, line), "the line and circle should intersect");

            circle = new Circle(4, 5, 3);
            line = new Line(0, 3, 1, 10);
            assert(!intersect.circleAndLine(circle, line), "the line and circle should not intersect");
          }
        );
      }
    );

    describe(
      "#pointToLine(pt, line)",
      function() {
        it(
          "returns line from pt to nearest pt on line",
          function() {
            var point = new Point(6, 0);
            var line = new Line(0, 0, 6, 6);
            var result = intersect.pointToLine(point, line);

            assert(Math.round(result.start.x) === 3, "the start x position of the line should b 3");
            assert(Math.round(result.start.y) === 3, "the start y position of the line should b 3");
            assert(Math.round(result.end.x) === 6, "the end y position of the line should b 6");
            assert(Math.round(result.end.y) === 0, "the end y position of the line should b 0");
          }
        );
      }
    );

    describe(
      "#rectAndRect(rect1, rect2)",
      function() {
        it(
          "returns rectangle of intersection",
          function() {
            var rect1;
            var rect2;
            var rect3;

            rect1 = new Rect(1, 1, 4, 4);
            rect2 = new Rect(2, 2, 5, 5);
            rect3 = intersect.rectAndRect(rect1, rect2);
            assert(rect3.x === 2, "the x position of the rectangle should b 2");
            assert(rect3.y === 2, "the y position of the rectangle should b 2");
            assert(rect3.width === 3, "the x position of the rectangle should b 3");
            assert(rect3.height === 3, "the y position of the rectangle should b 3");

            rect1 = new Rect(-7, 1, 4, 4);
            rect2 = new Rect(2, 2, 5, 5);
            rect3 = intersect.rectAndRect(rect1, rect2);
            assert(rect3 === null, "the rectangles should not intersect");
          }
        );
      }
    );
  }
);