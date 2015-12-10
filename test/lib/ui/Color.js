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

jsio("import ui.Color as Color");

describe(
  "ui.Color",
  function() {
    describe(
      "#constructor()",
      function() {
        it(
          "create a color",
          function() {
            var color;

            color = new Color(10, 11, 12, 0.5);
            assert(color.r === 10, "r should be 10");
            assert(color.g === 11, "g should be 11");
            assert(color.b === 12, "b should be 12");
            assert(Math.round(color.a * 1000) === Math.round(0.5 * 1000), "a should be 0.5");

            color = new Color("#F0D89E");
            assert(color.r === 0xF0, "r should be 0xF0");
            assert(color.g === 0xD8, "g should be 0xD8");
            assert(color.b === 0x9E, "b should be 0x9E");
            assert(color.a === 1, "a should be 1");

            color = new Color({a: 0.7, r: 56, g: 123, b: 249});
            assert(color.r === 56, "r should be 56");
            assert(color.g === 123, "g should be 123");
            assert(color.b === 249, "b should be 249");
            assert(Math.round(color.a * 1000) === Math.round(0.7 * 1000), "a should be 0.7");
          }
        );
      }
    );

    describe(
      "#toHex()",
      function() {
        it(
          "get the hexadecimal value of the color",
          function() {
            var color = new Color(43, 45, 47, 0.5);
            assert(color.toHex() === "#2b2d2f", "the color should be \"#2b2d2f\"");
          }
        );
      }
    );

    describe(
      "#parse(str)",
      function() {
        it(
          "parse a color string",
          function() {
            var color = new Color();
            color.parse("rgba(178,179,180,0.3)");
            assert(color.r === 178, "r should be 178");
            assert(color.g === 179, "g should be 179");
            assert(color.b === 180, "b should be 180");
            assert(Math.round(color.a * 1000) === Math.round(0.3 * 1000), "a should be 0.3");
          }
        );
      }
    );

    describe(
      "#toString()",
      function() {
        it(
          "parse a color string",
          function() {
            var color = new Color(202, 198, 194, 0.3);
            assert(color.toString() === "rgba(202,198,194,0.3)", "the color should be \"rgba(202,198,194,0.3)\"");
          }
        );
      }
    );
  }
);

