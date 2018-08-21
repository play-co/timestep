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

jsio("import math.array as array");

describe(
  "math.array",
  function() {
    describe(
      "#average(array, count)",
      function() {
        it(
          "calculate the avarage value of the array values",
          function() {
            assert(array.average([3, 4, 5]) === 4, "the avarage value should be 4");
          }
        );
      }
    );

    describe(
      "#average(array, count)",
      function() {
        it(
          "calculate the avarage value of a give number of items from an array",
          function() {
            assert(array.average([7, 8, 9, 1, 2], 3) === 8, "the avarage value should be 8");
          }
        );
      }
    );

    describe(
      "#weightedAverage(array, count)",
      function() {
        it(
          "calculate the weighted avarage value of the array values",
          function() {
            assert(array.average([30, 40, 50]) === 40, "the weighted avarage value should be 40");
          }
        );
      }
    );

    describe(
      "#subtract(a, b)",
      function() {
        it(
          "subtract two arrays",
          function() {
            var a = [12, 13, 14];
            var b = [5, 4, 3];
            var expected = [7, 9, 11];

            assert.deepEqual(array.subtract(a, b), expected, "check if the values are correct");
          }
        );
      }
    );

    describe(
      "#stddev(a)",
      function() {
        it(
          "calculate the standard deviation of an array",
          function() {
            var a = [12, 13, 14, 19, 20, 21];

            assert((array.stddev(a) * 10) | 0 === 39, "the standard deviation * 10 should be 39");
          }
        );
      }
    );

    describe(
      "#shuffle(a, randGen)",
      function() {
        it(
          "shuffle an array",
          function() {
            var found = false;
            var a = [];
            var i;

            for (i = 0; i < 1024 * 4; i++) {
              a.push(i);
            }
            a = array.shuffle(a);
            for (i = 0; i < 1024 * 4; i++) {
              if (a[i] !== i) {
                found = true;
                break;
              }
            }

            assert(found, "the array appears to be unshuffled -there's a small chance that this happens and the code works fine-");
          }
        );
      }
    );
  }
);