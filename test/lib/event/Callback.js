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

jsio("import event.Callback as Callback");
jsio("import base as base");

describe(
  "Callback",
  function() {
    var callback;

    beforeEach(
      function() {
        callback = new Callback();
      }
    );

    describe(
      "#constructor()",
      function() {
        it(
          "creates an instance of Callback",
          function() {
            assert(callback instanceof Callback, "callback is an instance of Callback");
          }
        );
      }
    );

    describe(
      "#run()",
      function() {
        it(
          "add a function to run",
          function() {
            callback.run(function(name) {});

            assert(callback._run.length === 1, "the should be 1 function");
          }
        );
      }
    );

    describe(
      "#fire()",
      function() {
        it(
          "execute one function",
          function() {
            var result = "";
            callback.run(function(name) { result = "x " + name; });
            callback.fire("y");

            assert(result === "x y", "result should be \"x y\"");
          }
        );
      }
    );

    describe(
      "#fire()",
      function() {
        it(
          "execute two functions",
          function() {
            var result = "";
            callback.run(function(name) { result += "x" + name; });
            callback.run(function(name) { result += "y" + name; });
            callback.fire("&");

            assert(result === "x&y&", "result should be \"x&y&\"");
          }
        );
      }
    );

    describe(
      "#fire()",
      function() {
        it(
          "fire should only execute the callback once",
          function() {
            var callback = new Callback();
            var first = true;

            callback.run(
              function() {
                if (!first) {
                  assert(false, "the callback should only be executed once");
                }
                first = false;
              }
            );

            callback.fire();
            callback.fire();
          }
        );
      }
    );

    describe(
      "#runOrTimeout(onFire, onTimeout, duration)",
      function() {
        it(
          "run two separate callbacks conditional, call the callback",
          function(done) {
            var callback = new Callback();
            callback.runOrTimeout(
              done,
              function() {
                assert(false, "This assert should not be executed");
              },
              1000
            );
            callback.fire();
          }
        );
      }
    );

    describe(
      "#runOrTimeout(onFire, onTimeout, duration)",
      function() {
        it(
          "run two separate callbacks conditional, wait for a timeout",
          function(done) {
            var callback = new Callback();
            callback.runOrTimeout(
              function() {
                assert(false, "This assert should not be executed");
              },
              done,
              50
            );
          }
        );
      }
    );

    describe(
      "#chain()",
      function() {
        it(
          "chain a number of functions before executing the callback",
          function(done) {
            var callback = new Callback();

            callback.run(
              function() {
                done(); // Don't pass done immediately because it doesn't want arguments!
              }
            );

            var chainFunc1 = callback.chain();
            var chainFunc2 = callback.chain();

            chainFunc1();
            chainFunc2();
          }
        );
      }
    );

    describe(
      "#fired()",
      function() {
        it(
          "chain a number of functions before executing the callback",
          function() {
            var callback = new Callback();
            var fired = false;

            callback.run(
              function() {
                fired = true;
              }
            );

            callback.fire();
            assert(callback.fired() && fired);
          }
        );
      }
    );

    describe(
      "#reset()",
      function() {
        it(
          "reset the callback to allow firing again",
          function() {
            var callback = new Callback();
            var count = 0;

            callback.run(
              function() {
                count++;
              }
            );

            callback.fire();
            callback.reset();
            callback.fire();
            assert(count === 2, "the callback should be fired twice");
          }
        );
      }
    );

    describe(
      "#clear()",
      function() {
        it(
          "clear the callback list",
          function() {
            var callback = new Callback();

            callback.run(
              function() {
                assert(false, "this functions should not be executed after clear")
              }
            );

            callback.clear();
            callback.fire();
          }
        );
      }
    );
  }
);