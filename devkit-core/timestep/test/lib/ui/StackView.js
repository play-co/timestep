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
jsio("import ui.StackView");

describe(
  "ui.StackView",
  function() {
    var view1;
    var view2;
    var view3;

    beforeEach(
      function() {
        view1 = new ui.StackView({parent: app._view});
        view2 = new View();
        view3 = new View();
      }
    );

    describe(
      "#constructor()",
      function() {
        it(
          "creates an instance of ui.StackView",
          function() {
            assert(view1 instanceof ui.StackView, "view is an instance of ui.StackView");
          }
        );
      }
    );

    describe(
      "#getStack()",
      function() {
        it(
          "get the stack",
          function() {
            assert(view1.getStack().length === 0, "the stack should be empty");
            view1.push(view2);
            assert(view1.getStack().length === 1, "the stack size should be 1");
          }
        );
      }
    );

    describe(
      "#getCurrentView()",
      function() {
        it(
          "get the current view",
          function() {
            assert(view1.getCurrentView() === null, "there shouldn't be any views on the stack");
            view1.push(view2);
            assert(view1.getCurrentView() === view2, "the current view should be view2");
            view1.push(view3);
            assert(view1.getCurrentView() === view3, "the current view should be view3");
          }
        );
      }
    );

    describe(
      "#hasView()",
      function() {
        it(
          "check if a view is on the stack",
          function() {
            view1.push(view2);
            view1.push(view3);
            assert(view1.hasView(view2), "view2 should be on the stack");
            assert(view1.hasView(view3), "view3 should be on the stack");
            assert(!view1.hasView(view1), "view1 should not be on the stack");
          }
        );
      }
    );

    describe(
      "#push(view)",
      function() {
        it(
          "push a view",
          function() {
            view1.push(view2);
            assert(view1.stack.length === 1, "the stack size should be 1");
          }
        );
      }
    );

    describe(
      "#pop()",
      function() {
        it(
          "pop a view",
          function() {
            view1.push(view2);
            view1.pop();
            assert(view1.stack.length === 0, "the stack size should be 0");
          }
        );
      }
    );

    describe(
      "#popAll()",
      function() {
        it(
          "pop all views",
          function() {
            view1.push(view2);
            view1.push(view3);
            view1.popAll();
            assert(view1.stack.length === 1, "there should be one view left on the stack");
          }
        );
      }
    );

    describe(
      "#remove(view)",
      function() {
        it(
          "remove a view",
          function() {
            view1.push(view2);
            view1.push(view3);
            view1.remove(view2);
            assert(view1.stack.length === 1, "there should be one view left on the stack");
            assert(view1.stack[0] === view3, "view3 should be left on the stack");
          }
        );
      }
    );

    describe(
      "ViewWillDisappear",
      function() {
        it(
          "view will disappear",
          function(done) {
            view1.push(view2);
            view2.subscribe(
              "ViewWillDisappear",
              function() {
                done();
              }
            )
            view1.pop();
          }
        );
      }
    );

    describe(
      "ViewDidDisappear",
      function() {
        it(
          "view did disappear",
          function(done) {
            view1.push(view2);
            view2.subscribe(
              "ViewDidDisappear",
              function() {
                done();
              }
            )
            view1.pop();
          }
        );
      }
    );

    describe(
      "ViewWillAppear",
      function() {
        it(
          "view will appear",
          function(done) {
            view2.subscribe(
              "ViewWillAppear",
              function() {
                done();
              }
            )
            view1.push(view2);
          }
        );
      }
    );

    describe(
      "ViewDidAppear",
      function() {
        it(
          "view did appear",
          function(done) {
            view2.subscribe(
              "ViewDidAppear",
              function() {
                done();
              }
            )
            view1.push(view2);
          }
        );
      }
    );
  }
);
