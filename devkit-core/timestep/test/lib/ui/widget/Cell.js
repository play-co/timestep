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

describe(
  "ui.widget.Cell",
  function() {
    describe(
      "#constructor()",
      function() {
        it(
          "create a cell",
          function() {
            var cell = new Cell({});
            assert(cell instanceof Cell, "cell should be an instance of Cell");
          }
        );
      }
    );

    describe(
      "#addCell(cell)",
      function() {
        it(
          "add a cell to a list",
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
      "#removeCell(list)",
      function() {
        it(
          "remove a cell from a list",
          function() {
            var list = new List({});
            var cell = new Cell({});
            assert(list.getContentView().getSubviews().length === 0, "there should not be any cells");
            list.addCell(cell);
            assert(list.getContentView().getSubviews().length === 1, "there should not be one cell");
            cell.remove(list);
            assert(list.getContentView().getSubviews().length === 0, "there should not be any cells");
          }
        );
      }
    );

    describe(
      "#setPosition(position)",
      function() {
        it(
          "set the position of the cell",
          function() {
            var cell = new Cell({});
            cell.setPosition({x: 39, y: 189});
            assert(cell.style.x === 39, "the x position of the cell should be 39");
            assert(cell.style.y === 189, "the y position of the cell should be 189");
          }
        );
      }
    );

    describe(
      "#getWidth()",
      function() {
        it(
          "get the width of the cell",
          function() {
            var cell = new Cell({width: 57, height: 11});
            assert(cell.getWidth() === 57, "the width of the cell should be 57");
          }
        );
      }
    );

    describe(
      "#getHeight()",
      function() {
        it(
          "get the height of the cell",
          function() {
            var cell = new Cell({width: 57, height: 11});
            assert(cell.getHeight() === 11, "the height of the cell should be 11");
          }
        );
      }
    );
  }
);