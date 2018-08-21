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

jsio("import ui.TextView as TextView");

describe(
  "ui.TextView",
  function() {
    var view;

    beforeEach(
      function() {
        view = new TextView({
          fontSize: 12,
          fontFamily: "Verdana"
        });
      }
    );

    describe(
      "#constructor()",
      function() {
        it(
          "creates an instance of TextView",
          function() {
            assert(view instanceof TextView, "view is an instance of ui.TextView");
          }
        );
      }
    );

    describe(
      "#setText(text)",
      function() {
        it(
          "sets the display text",
          function() {
            view.setText("The quick brown fox...");
            assert(view.getText() === "The quick brown fox...", "text is changed");
          }
        );
      }
    );

    describe(
      "#getText()",
      function() {
        it(
          "get the display text",
          function() {
            assert(view.getText() === "", "text should be and empty string");
          }
        );
      }
    );

    describe(
      "#getCharacterWidth(ctx)",
      function() {
        it(
          "returns the width of a single character",
          function() {
            var ctx = {measureText: function() { return {width: 12}; }};
            assert(view.getCharacterWidth(ctx) === 12, "character width should be 12");
          }
        );
      }
    );

    describe(
      "#getLineWidth(ctx, line)",
      function() {
        it(
          "returns the width of the line",
          function() {
            var ctx = {measureText: function(s) { return {width: s.length * 11}; }};
            assert(view.getLineWidth(ctx, 'abc') === 33, "line width should be 33");
          }
        );
      }
    );

    describe(
      "#updateOpts(opts)",
      function() {
        it(
          "updates the TextView options",
          function() {
            view.updateOpts({
              color: "white",
              backgroundColor: "red",
              horizontalPadding: 1,
              verticalPadding: 1,
              lineHeight: 3,
              textAlign: "right",
              verticalAlign: "top",
              multiline: false,
              fontSize: 13,
              fontFamily: "Arial",
              fontWeight: "bold",
              strokeStyle: "blue",
              lineWidth: 3,
              shadow: true,
              shadowColor: "green",
              autoSize: false
            });

            var opts = view._opts;

            assert(opts.color === "white", "color is white");
            assert(opts.backgroundColor === "red", "backgroundColor is red");
            assert(opts.horizontalPadding === 1, "horizontalPadding is 1");
            assert(opts.verticalPadding === 1, "verticalPadding is 1");
            assert(opts.lineHeight === 3, "lineHeight is 3");
            assert(opts.textAlign === "right", "textAlign is right");
            assert(opts.verticalAlign === "top", "verticalAlign is top");
            assert(opts.multiline === false, "multiline is false");
            assert(opts.fontSize === 13, "fontSize is 13");
            assert(opts.fontFamily === "Arial", "fontFamily is Arial");
            assert(opts.fontWeight === "bold", "fontWeight is bold");
            assert(opts.strokeStyle === "blue", "strokeStyle is blue");
            assert(opts.lineWidth === 3, "lineWidth is 3");
            assert(opts.shadow === true, "shadow is true");
            assert(opts.shadowColor === "green", "shadowColor is green");
            assert(opts.autoSize === false, "autoSize is false");
          }
        );
      }
    );
  }
);
