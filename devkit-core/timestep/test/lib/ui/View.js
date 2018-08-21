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

jsio("import ui.View as View");
jsio("import ui.backend.canvas.ViewBacking as ViewBacking");
jsio("import ui.Engine");
jsio("import ui.backend.ReflowManager as ReflowManager");
jsio("import math.geom.Point as Point");

describe(
  "ui.View",
  function() {
    var a, b, c;

    beforeEach(
      function() {
        a = new View({x: 11, y: 13, width: 115, height: 258});
        b = new View({x: 28, y: 35, width: 300, height: 299});
        c = new View({x: 54, y: 45, width: 510, height: 613});
      }
    );

    describe(
      "#constructor()",
      function() {
        it(
          "creates an instance of View",
          function() {
            assert(a instanceof View, "a is an instance of ui.View");
          }
        );
      }
    );

    describe(
      "opts.superview",
      function() {
        it(
          "sets the view's superview",
          function() {
            b = new View({superview: a});

            assert.equal(a.getSubview(0), b, "the subview of a is b");
            assert.equal(b.getSuperview(), a, "the superview of b is a");
          }
        );
      }
    );

    describe(
      "#style",
      function() {
        it(
          "should be an instance of ViewBacking",
          function() {
            assert.equal(typeof a.style, "object", "the style property is an object");
            assert(a.style instanceof ViewBacking, "the style property is an instance of ViewBacking");
          }
        );
      }
    );

    describe(
      "#getApp",
      function() {
        it(
          "check if the app is set",
          function() {
            a.__root = app;
            assert(a.getApp() === app, "should be a reference to app");
          }
        );
      }
    );

    describe(
      "#getSuperview()",
      function() {
        it(
          "returns the view's superview",
          function() {
            b = new View({superview: a});

            assert.equal(a.getSubview(0), b, "the subview of a is b");
            assert.equal(b.getSuperview(), a, "the superview of b is a");
          }
        );
      }
    );

    describe(
      "#getParents()",
      function() {
        it(
          "get the parent of a view",
          function() {
            a.addSubview(b);
            assert(b.getParents().length === 1, "there should be a parent list with one element");
            assert.equal(b.getParents()[0], a, "the first parent should be a");
          }
        );
      }
    );

    describe(
      "#getSubview(i)",
      function() {
        it(
          "get a subview",
          function() {
            a.addSubview(b);
            a.addSubview(c);
            assert(a.getSubview(0) === b, "b should be the first subview");
            assert(a.getSubview(1) === c, "c should be the first subview");
          }
        );
      }
    );

    describe(
      "#getSubviews()",
      function() {
        it(
          "get the subview list",
          function() {
            b = new View({superview: a});
            assert(a.getSubviews(), "there should be a subview list");
            assert(a.getSubviews().length === 1, "there should one subview");
            assert.equal(a.getSubviews()[0], b, "the first subview should be b");
          }
        );
      }
    );

    describe(
      "#addSubview(view)",
      function() {
        it(
          "add a subview",
          function() {
            a.addSubview(b);
            assert(a.getSubviews(), "there should be a subview list");
            assert(a.getSubviews().length === 1, "there should one subview");
            assert.equal(a.getSubviews()[0], b, "the first subview should be b");
          }
        );
      }
    );

    describe(
      "#removeSubview(view)",
      function() {
        it(
          "remove a subview",
          function() {
            b = new View({superview: a});
            a.removeSubview(b);
            assert(a.getSubviews().length === 0, "there should be no more subviews");
          }
        );
      }
    );

    describe(
      "#removeAllSubviews()",
      function() {
        it(
          "remove all subviews from a view",
          function() {
            a.addSubview(b);
            a.addSubview(c);
            assert(a.getSubviews(), "there should be a subview list");
            assert(a.getSubviews().length === 2, "there should twi subview");
            assert.equal(a.getSubviews()[0], b, "the first subview should be b");
            assert.equal(a.getSubviews()[1], c, "the second subview should be b");
            a.removeAllSubviews();
            assert(a.getSubviews().length === 0, "the subview list should be empty");
          }
        );
      }
    );

    describe(
      "#removeFromSuperview()",
      function() {
        it(
          "remove a view from its superview",
          function() {
            a.addSubview(b);
            assert(a.getSubviews(), "there should be a subview list");
            assert(a.getSubviews().length === 1, "there should one subview");
            assert.equal(a.getSubviews()[0], b, "the first subview should be b");
            b.removeFromSuperview();
            assert(a.getSubviews().length === 0, "the subview list should be empty");
          }
        );
      }
    );

    describe(
      "#needsRepaint()",
      function() {
        it(
          "set repaint",
          function() {
            a.needsRepaint();
            assert(a._needsRepaint, "needsRepaint should be true");
          }
        );
      }
    );

    describe(
      "#needsReflow()",
      function() {
        it(
          "set reflow",
          function() {
            a.needsReflow(true);
            assert(ReflowManager.get()._pending[a.uid], "a should be in the pending list");
            assert(ReflowManager.get()._pending[a.uid].view, "the view should be in the pending list");
          }
        );
      }
    );

    describe(
      "#getInput()",
      function() {
        it(
          "get input",
          function() {
            assert(a.uid === a.getInput().view.uid, "the view is it's own input handler");
          }
        );
      }
    );

    describe(
      "#isInputOver()",
      function() {
        it(
          "get input over",
          function() {
            assert(!a.isInputOver(), "input over should be false");
          }
        );
      }
    );

    describe(
      "#startDrag(opts)",
      function() {
        it(
          "start dragging",
          function() {
            a.startDrag({
              inputStartEvt: {
                id: 0,
                srcPt: {
                  x: 3,
                  y: 5
                },
                root: {
                  subscribe: function(type) {
                    assert(
                      type === "InputMoveCapture" ||
                      type === "InputSelectCapture",
                      "should subscribe to \"InputMoveCapture\" or \"InputSelectCapture\""
                    );
                  }
                }
              }
            });
          }
        );
      }
    );

    describe(
      "#isDragging()",
      function() {
        it(
          "check if dragging",
          function() {
            assert(!a.isDragging(), "dragging should not be true");
          }
        );
      }
    );

    describe(
      "#localizePoint(point)",
      function() {
        it(
          "localize a point",
          function() {
            b.style.x = 0;
            b.style.y = 0;
            b.style.width = 400;
            b.style.height = 400;
            b.addSubview(a);
            var point = new Point(55, 79);
            point = a.localizePoint(point);
            assert(point.x === 44, "the x value should be 44 (55 - 11) but it is " + point.x);
            assert(point.y === 66, "the y value should be 44 (76 - 13) but it is " + point.y);
          }
        );
      }
    );

    describe(
      "#getPosition(relativeTo)",
      function() {
        it(
          "get the position",
          function() {
            var position;

            position = a.getPosition();
            assert(position.x === 11, "the x position should be 11");
            assert(position.y === 13, "the y position should be 13");
            assert(position.width === 115, "the width should be 115");
            assert(position.height === 258, "the width should be 258");
            assert(position.scale === 1, "the scale should be 1");

            b.addSubview(a);
            c.addSubview(b);
            position = a.getPosition(c);
            assert(position.x === 39, "the x position should be 39 (11 + 28)");
            assert(position.y === 48, "the y position should be 48 (13 + 35)");
            assert(position.width === 115, "the width should be 115");
            assert(position.height === 258, "the width should be 258");
            assert(position.scale === 1, "the scale should be 1");
          }
        );
      }
    );

    describe(
      "#containsLocalPoint(point)",
      function() {
        it(
          "check if the point is inside the view",
          function() {
            assert(a.containsLocalPoint(new Point(50, 50)), "the point should be inside");
            assert(!a.containsLocalPoint(new Point(50, 259)), "the point should be outside");
          }
        );
      }
    );

    describe(
      "#containsLocalPoint(pt)",
      function() {
        it(
          "check if the point falls inside the view",
          function() {
            a.style.width = 100;
            a.style.height = 100;
            assert(a.containsLocalPoint({x: 50, y: 50}), "the point should be inside the view");
          }
        );
      }
    );

    describe(
      "#containsLocalPoint(pt)",
      function() {
        it(
          "check if the point falls outside the view",
          function() {
            a.style.width = 100;
            a.style.height = 100;
            assert(!a.containsLocalPoint({x: 101, y: 50}), "the point should be outside the view");
            assert(!a.containsLocalPoint({x: 50, y: 101}), "the point should be outside the view");
            assert(!a.containsLocalPoint({x: 50, y: -1}), "the point should be outside the view");
            assert(!a.containsLocalPoint({x: -1, y: 50}), "the point should be outside the view");
          }
        );
      }
    );

    describe(
      "#containsLocalPoint(pt)",
      function() {
        it(
          "check if the point falls inside an infinite view",
          function() {
            a.updateOpts({infinite: true});
            assert(a.containsLocalPoint({x: 100000000, y: 100000000}), "the point should always be inside the view");
          }
        );
      }
    );

    describe(
      "#getBoundingShape()",
      function() {
        it(
          "get the bounding shape of the view",
          function() {
            var shape = a.getBoundingShape();
            assert(shape.x === 11, "the x position should be 11");
            assert(shape.y === 13, "the y position should be 13");
            assert(shape.width === 115, "the width should be 115");
            assert(shape.height === 258, "the height should be 258");
          }
        );
      }
    );

    describe(
      "#getBoundingShape()",
      function() {
        it(
          "check if the bounding shape is true",
          function() {
            a.updateOpts({infinite: true});
            assert.equal(a.getBoundingShape(), true, "the bounding shape should be true");
          }
        );
      }
    );

    describe(
      "#getBoundingShape()",
      function() {
        it(
          "check if the bounding shape is a circle",
          function() {
            a.style.x = 10;
            a.style.y = 20;
            a.style.width = 100;
            a.style.height = 110;
            a.style.scale = 2;
            a.style.radius = 50;
            a.updateOpts({circle: true});
            var shape = a.getBoundingShape();
            assert(shape, "the should be a bounding shape");
            assert(shape.x === 10, "x should be 10");
            assert(shape.y === 20, "y should be 20");
            assert(shape.radius === 100, "radius should be 100");
          }
        );
      }
    );

    describe(
      "#getRelativeRegion(parent)",
      function() {
        it(
          "get relative region of the view",
          function() {
            var relativeRegion;

            b.addSubview(a);
            c.addSubview(b);
            relativeRegion = a.getRelativeRegion({x: 25, y: 39, width: 38, height: 11}, b);
            assert(relativeRegion.x === 14, "the x position should be 14 (25 - 11)");
            assert(relativeRegion.y === 26, "the y position should be 26 (39 - 13)");
            assert(relativeRegion.width === 38, "the width should be 38");
            assert(relativeRegion.height === 11, "the height should be 11");

            relativeRegion = a.getRelativeRegion({x: 25, y: 39, width: 38, height: 11}, c);
            assert(relativeRegion.x === -14, "the x position should be -14 (25 - 11 - 28)");
            assert(relativeRegion.y === -9, "the y position should be -9 (39 - 13 - 35)");
            assert(relativeRegion.width === 38, "the width should be 38");
            assert(relativeRegion.height === 11, "the height should be 11");
          }
        );
      }
    );

    describe(
      "#getFilters()",
      function() {
        it(
          "initially the should be no filters",
          function() {
            assert(a.getFilters(), "filters should be a valid object");
            assert(Object.keys(a.getFilters()).length === 0, "filters should be empty");
          }
        );
      }
    );

    describe(
      "#addFilter(filter)",
      function() {
        it(
          "add a filter",
          function() {
            var TestFilter = function() {
              this.getType = function() { return "test"; };
            };
            var testFilter = new TestFilter();

            a.addFilter(testFilter);
            assert(a.getFilters(), "filters should be a valid object");
            assert(Object.keys(a.getFilters()).length === 1, "there should be one filter");
            assert(a._filters.test instanceof TestFilter, "the filter should be test filter");
          }
        );
      }
    );

    describe(
      "#removeFilter(type)",
      function() {
        it(
          "remove a filter",
          function() {
            var TestFilter = function() {
              this.getType = function() { return "test"; };
            };
            var testFilter = new TestFilter();

            a.addFilter(testFilter);
            assert(a.getFilters(), "filters should be a valid object");
            assert(Object.keys(a.getFilters()).length === 1, "there should be one filter");
            a.removeFilter("test");
            assert(Object.keys(a.getFilters()).length === 0, "filters should be empty");
          }
        );
      }
    );

    describe(
      "#removeFilter(type)",
      function() {
        it(
          "remove a filter which isn't there",
          function() {
            var TestFilter = function() {
              this.getType = function() { return "test"; };
            };
            var testFilter = new TestFilter();

            a.addFilter(testFilter);
            assert(a.getFilters(), "filters should be a valid object");
            assert(Object.keys(a.getFilters()).length === 1, "there should be one filter");
            a.removeFilter("x");
            assert(Object.keys(a.getFilters()).length === 1, "there should still be one filter");
          }
        );
      }
    );

    describe(
      "#updateOpts(opts)",
      function() {
        it(
          "update the options",
          function() {
            var TestFilter = function() {};
            var testFilter = new TestFilter();
            var TestCircle = function() {};
            var testCircle = new TestCircle();

            var testOpts = {
              tag: "tag name",
              filters: [testFilter],
              circle: testCircle,
              infinite: true
            };

            assert(a.updateOpts(testOpts) === testOpts, "updateOpts should return opts");
            assert(a.tag === "tag name");
            assert(a._filters.length === 1, "there should be one filter");
            assert(a._filters[0] instanceof TestFilter, "the filter should be a test filter");
            assert(a._circle instanceof TestCircle, "the filter should be a test circle");
          }
        );
      }
    );

    describe(
      "#updateOpts(opts)",
      function() {
        it(
          "update the options with parent",
          function() {
            var testOpts = {
              parent: b
            };

            assert(a.updateOpts(testOpts) === testOpts, "updateOpts should return opts");
            assert.equal(a.getSuperview(), b, "the superview of a is b");
          }
        );
      }
    );

    describe(
      "#updateOpts(opts)",
      function() {
        it(
          "update the options with superview",
          function() {
            var testOpts = {
              superview: b
            };

            assert(a.updateOpts(testOpts) === testOpts, "updateOpts should return opts");
            assert.equal(a.getSuperview(), b, "the superview of a is b");
          }
        );
      }
    );

    describe(
      "#focus()",
      function() {
        it(
          "focus the view",
          function() {
            assert(a.focus() === a, "focus should return a reference to itself");
            assert(a._isFocused === true, "focused should be true");
          }
        );
      }
    );

    describe(
      "#blur()",
      function() {
        it(
          "blur -unfocus- the view",
          function() {
            assert(a.blur() === a, "blur should return a reference to itself");
            assert(a._isFocused === false, "focused should be false");
          }
        );
      }
    );

    describe(
      "#show()",
      function() {
        it(
          "make a view visible",
          function() {
            a.hide();
            a.show();
            assert(a.style.visible, "view should be visible");
          }
        );
      }
    );

    describe(
      "#hide()",
      function() {
        it(
          "hide a view",
          function() {
            a.hide();
            assert(!a.style.visible, "view should be not visible");
          }
        );
      }
    );
  }
);