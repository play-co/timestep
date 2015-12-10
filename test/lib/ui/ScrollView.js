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

jsio("import ui.ScrollView as ScrollView");
// jsio("import ui.layout.LinearView as LinearView");

describe(
  "ui.ScrollView",
  function() {
    var view1;
    // var view2;

    beforeEach(
      function() {
        view1 = new ScrollView({
          parent: app._view,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          scrollBounds: {
            minX: 0,
            maxX: 200,
            minY: 0,
            maxY: 250
          }
        });
        // view2 = new LinearView({
        //  superview: view1,
        //  width: 200,
        //  height: 250
        // });
      }
    );

    describe(
      "#constructor()",
      function() {
        it(
          "creates an instance of ScrollView",
          function() {
            assert(view1 instanceof ScrollView, "view is an instance of ui.ScrollView");
          }
        );
      }
    );

    describe(
      "#getStyleBounds()",
      function() {
        it(
          "get the style bounds of the scrollView",
          function() {
            var styleBounds = view1.getStyleBounds();

            assert(styleBounds.minY === -150, "the minY value should be -150 (100 - 250)");
            assert(styleBounds.maxY === 0, "the maxY value should be 0");
            assert(styleBounds.minX === -100, "the minY value should be -100 (100 - 200)");
            assert(styleBounds.maxY === 0, "the maxY value should be 0");
          }
        );
      }
    );

    describe(
      "#getOffset()",
      function() {
        it(
          "get the scroll offset",
          function() {
            view1.setOffset(11, 12);
            assert(view1.getOffset().x === 0, "the x position should be 0");
            assert(view1.getOffset().y === 0, "the y position should be 0");

            view1.setOffset(-11, -12);
            assert(view1.getOffset().x === -11, "the x position should be -11");
            assert(view1.getOffset().y === -12, "the y position should be -12");
          }
        );
      }
    );

    describe(
      "#setOffset(x, y)",
      function() {
        it(
          "set the scroll offset",
          function() {
            var contentView = view1.getContentView();

            view1.setOffset(11, 12);
            assert(contentView.style.x === 0, "the x position should be 0");
            assert(contentView.style.y === 0, "the y position should be 0");

            view1.setOffset(-11, -12);
            assert(contentView.style.x === -11, "the x position should be -11");
            assert(contentView.style.y === -12, "the y position should be -12");
          }
        );
      }
    );

    describe(
      "#stopScrolling()",
      function() {
        it(
          "stop the scrolling",
          function() {
            view1.stopScrolling();
          }
        );
      }
    );

    describe(
      "#setScrollBounds()",
      function() {
        it(
          "set the scroll bounds of the view",
          function() {
            view1.setScrollBounds({minX: 10, minY: 10, maxX: 190, maxY: 240});
            var scrollBounds = view1.getScrollBounds();

            assert(scrollBounds.minX === 10, "the minX value should be 10");
            assert(scrollBounds.minY === 10, "the minY value should be 10");
            assert(scrollBounds.maxX === 190, "the maxX value should be 190");
            assert(scrollBounds.maxY === 240, "the maxY value should be 240");
          }
        );
      }
    );

    describe(
      "#getScrollBounds()",
      function() {
        it(
          "get the scroll bounds of the view",
          function() {
            var scrollBounds = view1.getScrollBounds();

            assert(scrollBounds.minX === 0, "the minX value should be 0");
            assert(scrollBounds.minY === 0, "the minY value should be 0");
            assert(scrollBounds.maxX === 200, "the maxX value should be 200");
            assert(scrollBounds.maxY === 250, "the maxY value should be 250");
          }
        );
      }
    );

    describe(
      "#addOffset(x, y)",
      function() {
        it(
          "add values to the offset",
          function() {
            view1.setOffset(-11, -12);
            view1.addOffset(20, 30);
            assert(view1.getOffset().x === 0, "the x position should be 0");
            assert(view1.getOffset().y === 0, "the y position should be 0");

            view1.setOffset(-11, -12);
            view1.addOffset(2, 4);
            assert(view1.getOffset().x === -9, "the x position should be -9");
            assert(view1.getOffset().y === -8, "the y position should be -8");
          }
        );
      }
    );

    describe(
      "#getContentView()",
      function() {
        it(
          "get the content view of the scrollView",
          function() {
            var contentView = view1.getContentView();

            assert(contentView, "there should be a contentView");
            assert(contentView instanceof View, "the contentView should be an instance of View");
          }
        );
      }
    );

    describe(
      "#scrollTo(x, y, duration, callback)",
      function() {
        it(
          "scroll to a given position in a given time, then execute a callback",
          function(done) {
            view1.scrollTo(
              30,
              40,
              100,
              function() {
                done(); // Don't pass done immediately because the callback param is interpreted as an error...
              }
            );
          }
        );
      }
    );

    describe(
      "#scrollTo(x, y, duration, callback)",
      function() {
        it(
          "scroll to a given position in a given time",
          function(done) {
            view1.scrollTo(30, 40, 100);
            setTimeout(
              function() {
                assert(view1.getOffset().x === -30, "the x position should be -30");
                assert(view1.getOffset().y === -40, "the y position should be -40");
                done();
              },
              200
            );
          }
        );
      }
    );
  }
);