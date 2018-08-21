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

jsio("import math.util as util");

describe(
  "math.util",
  function() {
    describe(
      "#interpolate(a, b, x)",
      function() {
        it(
          "interpolate between two values",
          function() {
            assert((util.interpolate(10, 90, 0.5) | 0) === 50, "the (rounded) value should be 50");
          }
        );
      }
    );

    describe(
      "#random(a, b, rand)",
      function() {
        it(
          "get a random value and check the range",
          function() {
            var r = (util.random(0.2, 0.8) * 10000) | 0; // Convert to integers to avoid comparing floats...
            assert((r >= 2000) && (r < 8000), "the value should be greater or equal then 2000 and lower than 8000");
          }
        );
      }
    );

    describe(
      "#randomInclusive(a, b, rand)",
      function() {
        it(
          "get a random value and check the range",
          function() {
            var r = (util.randomInclusive(0.2, 0.8) * 10000) | 0; // Convert to integers to avoid comparing floats...
            assert((r >= 2000) && (r < 18000), "the value should be greater or equal then 2000 and lower than 18000");
          }
        );
      }
    );

    describe(
      "#clip(n, min, max)",
      function() {
        it(
          "clip a value between two given values",
          function() {
            var n;

            n = util.clip(20, 40, 60);
            assert(n === 40, "the value 40");
            n = util.clip(80, 40, 60);
            assert(n === 60, "the value 60");
            n = util.clip(50, 40, 60);
            assert(n === 50, "the value 50");
          }
        );
      }
    );

    describe(
      "#sign(n)",
      function() {
        it(
          "check if a value is positive or negative",
          function() {
            assert(util.sign(-0.2) === -1, "the value should be negative");
            assert(util.sign(0.7) === 1, "the value should be positive");
            assert(util.sign(0) === 0, "the value should be zero");
            assert(util.sign(-0.0) === 0, "the value should be zero");
          }
        );
      }
    );

    describe(
      "#round(a, precision, method)",
      function() {
        it(
          "round a value to even",
          function() {
            // Values are converted to integers to allow comparing...
            assert(util.round(5.4, 0, util.round.ROUND_HALF_TO_EVEN) | 0 === 5, "the value should be 5");
            assert(util.round(5.6, 0, util.round.ROUND_HALF_TO_EVEN) | 0 === 6, "the value should be 6");
            assert((util.round(5.65, 1, util.round.ROUND_HALF_TO_EVEN) * 10) | 0 === 57, "the value should be 57");
            assert((util.round(5.15, 1, util.round.ROUND_HALF_TO_EVEN) * 10) | 0 === 51, "the value should be 51");
          }
        );
      }
    );

    describe(
      "#round(a, precision, method)",
      function() {
        it(
          "round a value to odd",
          function() {
            // Values are converted to integers to allow comparing...
            assert(util.round(4.4, 0, util.round.ROUND_HALF_TO_ODD) | 0 === 4, "the value should be 4");
            assert(util.round(4.6, 0, util.round.ROUND_HALF_TO_ODD) | 0 === 5, "the value should be 5");
            assert((util.round(4.65, 1, util.round.ROUND_HALF_TO_ODD) * 10) | 0 === 47, "the value should be 47");
            assert((util.round(4.15, 1, util.round.ROUND_HALF_TO_ODD) * 10) | 0 === 41, "the value should be 41");
          }
        );
      }
    );
  }
);