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

jsio("import ui.widget.List as List");
jsio("import ui.widget.Cell as Cell");

// list.model, list.selection should be removed from docs

describe(
  "ui.widget.List",
  function() {
    describe(
      "#constructor()",
      function() {
        it(
          "create a list",
          function() {
            var list = new List({});
            assert(list instanceof List, "list should be an instance of List");
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
            var list = new List({});
            list.updateOpts({x: 51, y: 69});
            assert(list.style.x === 51, "the x position should be 51");
            assert(list.style.y === 69, "the y position should be 69");
          }
        );
      }
    );

    describe(
      "#addCell(cell)",
      function() {
        it(
          "add a cell",
          function() {
            var list = new List({});
            var cell = new Cell({});
            assert(list.getContentView().getSubviews().length === 0, "there should not be any cells");
            list.addCell(cell);
            assert(list.getContentView().getSubviews().length === 1, "there should not be one cell");
          }
        );
      }
    );

    describe(
      "#setMaxY(maxY)",
      function() {
        it(
          "set the maximum y position",
          function() {
            var list = new List({});
            list.setMaxY(234);
            assert(list.getScrollBounds().maxY === 234, "the maxY value of the scrollBounds should be 234");
          }
        );
      }
    );
  }
);