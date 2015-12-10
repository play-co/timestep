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

jsio("import ui.filter as filter");
jsio("import ui.View as View");

describe(
  "ui.filter",
  function() {
    describe(
      "#constructor()",
      function() {
        it(
          "create a filter",
          function() {
            var f = new filter.Filter();
            assert(f instanceof filter.Filter, "filter should be and instance of Filter");
          }
        );
      }
    );

    describe(
      "#get()",
      function() {
        it(
          "create a filter",
          function() {
            var f1 = new filter.Filter({priority: 11, r: 34, g: 45, b: 56, a: 0.3});
            var f2 = f1.get();

            assert(f2.priority === 11, "the priority should be 11");
            assert(f2.r === 34, "r should be 34");
            assert(f2.g === 45, "g should be 45");
            assert(f2.b === 56, "b should be 56");
            assert(Math.round(f2.a * 10000) === Math.round(0.3 * 10000), "a should be 0.3");
          }
        );
      }
    );

    describe(
      "#getType()",
      function() {
        it(
          "get the type of a filter",
          function() {
            var f = new filter.Filter({type: "test filter"});

            assert(f.getType() === "test filter", "the type of the filter should be \"test filter\"");
          }
        );
      }
    );

    describe(
      "#update(options)",
      function() {
        it(
          "update a filter",
          function() {
            var f = new filter.Filter({priority: 11, r: 34, g: 45, b: 56, a: 0.3});
            f.update({priority: 23, r: 231, g: 46, b: 9, a: 0.1});

            assert(f._opts.r === 231, "r should be 231");
            assert(f._opts.g === 46, "g should be 46");
            assert(f._opts.b === 9, "b should be 9");
            assert(Math.round(f._opts.a * 10000) === Math.round(0.1 * 10000), "a should be 0.1");
          }
        );
      }
    );

    describe(
      "#setView(view)",
      function() {
        it(
          "set the view",
          function() {
            var f = new filter.Filter();
            var v = new View();
            f.setView(v);
            assert(f._view === v, "the view should be v");
          }
        );
      }
    );

    describe(
      "#getColorString()",
      function() {
        it(
          "get a color string",
          function() {
            var f = new filter.Filter({r: 81, g: 15, b: 219, a: 0.6});
            assert(f.getColorString() === "rgba(81,15,219,0.6)", "the color string should be \"rgba(81,15,219,0.6)\"");
          }
        );
      }
    );
  }
);