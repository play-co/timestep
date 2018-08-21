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

jsio("import math.geom.angle as angle");

describe(
  "math.geom.angle",
  function() {
    describe(
      "#average(a, b, weight)",
      function() {
        it(
          "get the average angle",
          function() {
            var angle1 = Math.PI * 0.25;
            var angle2 = Math.PI * 0.75;
            var angle3 = angle.average(angle1, angle2);

            assert(
              Math.round(angle3 * 10000000) === Math.round(Math.PI / 2 * 10000000),
              "the average angle should be Math.PI / 2"
            );
          }
        );
      }
    );

    describe(
      "#normalize(a)",
      function() {
        it(
          "normalize the angle",
          function() {
            var a = angle.normalize(Math.PI * 3.5);

            assert(
              Math.round(a * 10000000) === Math.round(-Math.PI / 2 * 10000000),
              "the normalized angle should be Math.PI / 2"
            );
          }
        );
      }
    );

    describe(
      "#add(a, b)",
      function() {
        it(
          "add an angle to another angle",
          function() {
            var angle1;
            var angle2;
            var angle3;

            angle1 = Math.PI * 0.2;
            angle2 = Math.PI * 0.3;
            angle3 = angle.add(angle1, angle2);
            assert(
              Math.round(angle3 * 10000000) === Math.round(Math.PI * 0.5 * 10000000),
              "the angle should be Math.PI * 0.5"
            );

            angle1 = Math.PI * 1.2;
            angle2 = Math.PI * 0.3;
            angle3 = angle.add(angle1, angle2);
            assert(
              Math.round(angle3 * 10000000) === Math.round((Math.PI * 1.5 - Math.PI * 2) * 10000000),
              "the angle should be Math.PI * (1.2 + 0.3) - Math.PI * 2"
            );
          }
        );
      }
    );

    describe(
      "#difference(a, b)",
      function() {
        it(
          "get the difference between two angles",
          function() {
            var angle1;
            var angle2;
            var angle3;

            angle1 = Math.PI * 0.2;
            angle2 = Math.PI * 0.7;
            angle3 = angle.difference(angle1, angle2);
            assert(
              Math.round(angle3 * 10000000) === Math.round(Math.PI / 2 * 10000000),
              "the differenct between the angles should be Math.PI / 2"
            );

            angle1 = Math.PI * -0.9;
            angle2 = Math.PI * 0.2;
            angle3 = angle.difference(angle1, angle2);
            assert(
              Math.round(angle3 * 10000000) === Math.round((-Math.PI + Math.PI * 0.1) * 10000000),
              "the differenct between the angles should be -Math.PI + Math.PI * 0.1"
            );
          }
        );
      }
    );
  }
);