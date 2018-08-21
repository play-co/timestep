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

jsio("import event.Emitter as Emitter");
jsio("import base as base");

describe(
  "Emitter",
  function() {
    var emitter;

    beforeEach(
      function() {
        emitter = new Emitter();
      }
    );

    describe(
      "#constructor()",
      function() {
        it(
          "creates an instance of Emitter",
          function() {
            assert(emitter instanceof Emitter, "emitter is an instance of Emitter");
          }
        );
      }
    );

    describe(
      "#subscribe(signal, ctx, method)",
      function() {
        it(
          "a single class subscribes to an event",
          function(done) {
            var TestClass = function() {
              this.testFunc = function() {
                assert(this === testClass, "this should be bound to testClass");
                done();
              };
            };
            var testClass = new TestClass();

            emitter.subscribe("Test", testClass, "testFunc");
            emitter.publish("Test");
          }
        );
      }
    );

    describe(
      "#subscribe(signal, ctx, method)",
      function() {
        it(
          "a single class subscribes to an event without late dynamic binding",
          function(done) {
            var TestClass = function() {
              this.testFunc = function() {
                assert(this === testClass, "this should be bound to testClass");
                done();
              };
            };
            var testClass = new TestClass();

            emitter.subscribe("Test", testClass, testClass.testFunc);
            emitter.publish("Test");
          }
        );
      }
    );

    describe(
      "#subscribe(signal, ctx, method)",
      function() {
        it(
          "multiple classes subscribe to an event",
          function() {
            var callsMade = 0;
            var TestClass1 = function() {
              this.testFunc = function() {
                assert(this === testClass1, "this should be bound to testClass1");
                callsMade++;
              };
            };
            var testClass1 = new TestClass1();
            var TestClass2 = function() {
              this.testFunc = function() {
                assert(this === testClass2, "this should be bound to testClass2");
                callsMade++;
              };
            };
            var testClass2 = new TestClass2();

            emitter.subscribe("Test", testClass1, "testFunc");
            emitter.subscribe("Test", testClass2, "testFunc");
            emitter.publish("Test");
            assert(callsMade === 2, "there should be 2 calls made");
          }
        );
      }
    );

    describe(
      "#subscribe(signal, ctx, method)",
      function() {
        it(
          "a single class subscribes to an event, the publisher adds parameters",
          function(done) {
            var TestClass = function() {
              this.testFunc = function() {
                assert(this === testClass, "this should be bound to testClass");
                assert(arguments.length === 2, "there should be 2 parameters");
                assert(arguments[0] === 1, "the first parameter should be 1");
                assert(arguments[1] === "x", "the first parameter should be \"x\"");
                done();
              };
            };
            var testClass = new TestClass();

            emitter.subscribe("Test", testClass, "testFunc");
            emitter.publish("Test", 1, "x");
          }
        );
      }
    );

    describe(
      "#subscribeOnce(signal, ctx, method)",
      function() {
        it(
          "subscribe to an event which can be published once",
          function() {
            var callsMade = 0;
            var TestClass = function() {
              this.testFunc = function() {
                assert(this === testClass, "this should be bound to testClass");
                callsMade++;
              };
            };
            var testClass = new TestClass();

            emitter.subscribeOnce("Test", testClass, "testFunc");
            emitter.publish("Test"); // once
            emitter.publish("Test"); // twice, not executed
            assert(callsMade === 1, "there should only be one call executed");
          }
        );
      }
    );

    describe(
      "#subscribeOnce(signal, ctx, method)",
      function() {
        it(
          "subscribe to an event which can be published once, publisher adds parameters",
          function() {
            var callsMade = 0;
            var TestClass = function() {
              this.testFunc = function() {
                assert(this === testClass, "this should be bound to testClass");
                assert(arguments[0] === 2, "the first parameter should be 2");
                assert(arguments[1] === "y", "the first parameter should be \"y\"");
                callsMade++;
              };
            };
            var testClass = new TestClass();

            emitter.subscribeOnce("Test", testClass, "testFunc");
            emitter.publish("Test", 2, "y"); // once
            emitter.publish("Test"); // twice, not executed
            assert(callsMade === 1, "there should only be one call executed");
          }
        );
      }
    );

    describe(
      "#unsubscribe(signal, ctx, method)",
      function() {
        it(
          "unsubscribe an event",
          function() {
            var callsMade = 0;
            var TestClass = function() {
              this.testFunc = function() {
                assert(this === testClass, "this should be bound to testClass");
                callsMade++;
              };
            };
            var testClass = new TestClass();

            emitter.subscribe("Test", testClass, "testFunc");
            emitter.publish("Test"); // once
            emitter.unsubscribe("Test", testClass, "testFunc");
            emitter.publish("Test"); // twice, not executed
            assert(callsMade === 1, "there should only be one call executed");
          }
        );
      }
    );

    describe(
      "#addListener(type, f)",
      function() {
        it(
          "add a listener",
          function(done) {
            var TestClass = function() {
              this.testFunc = function() {
                assert(this === testClass, "this should be bound to testClass");
                done();
              };
            };
            var testClass = new TestClass();

            emitter.addListener("Test", base.bind(testClass, "testFunc"));
            emitter.publish("Test");
          }
        );
      }
    );

    describe(
      "#addListener(type, f)",
      function() {
        it(
          "add multiple listeners",
          function() {
            var callsMade = 0;
            var TestClass1 = function() {
              this.testFunc = function() {
                assert(this === testClass1, "this should be bound to testClass1");
                callsMade++;
              };
            };
            var testClass1 = new TestClass1();
            var TestClass2 = function() {
              this.testFunc = function() {
                assert(this === testClass2, "this should be bound to testClass2");
                callsMade++;
              };
            };
            var testClass2 = new TestClass2();

            emitter.addListener("Test", base.bind(testClass1, "testFunc"));
            emitter.addListener("Test", base.bind(testClass2, "testFunc"));
            emitter.publish("Test");
            assert(callsMade === 2, "there should be 2 calls made");
          }
        );
      }
    );

    describe(
      "#removeListener(type, f)",
      function() {
        it(
          "remove an event listener",
          function() {
            var callsMade = 0;
            var TestClass = function() {
              this.testFunc = function() {
                assert(this === testClass, "this should be bound to testClass");
                callsMade++;
              };
            };
            var testClass = new TestClass();
            var callback = base.bind(testClass, "testFunc");

            emitter.addListener("Test", callback);
            emitter.publish("Test"); // once
            emitter.removeListener("Test", callback);
            emitter.publish("Test"); // twice, not executed
            assert(callsMade === 1, "there should only be one call executed");
          }
        );
      }
    );

    describe(
      "#removeAllListeners(type)",
      function() {
        it(
          "remove an event listener",
          function() {
            var callsMade = 0;
            var TestClass1 = function() {
              this.testFunc = function() {
                callsMade++;
              };
            };
            var testClass1 = new TestClass1();
            var TestClass2 = function() {
              this.testFunc = function() {
                callsMade++;
              };
            };
            var testClass2 = new TestClass2();

            emitter.addListener("Test", base.bind(testClass1, "testFunc"));
            emitter.addListener("Test", base.bind(testClass2, "testFunc"));
            emitter.removeAllListeners("Test");
            emitter.publish("Test");
            assert(callsMade === 0, "there shouldn't be any calls executed");
          }
        );
      }
    );

    describe(
      "#removeAllListeners(type)",
      function() {
        it(
          "remove an event listener",
          function() {
            var callsMade = 0;
            var TestClass1 = function() {
              this.testFunc = function() {
                assert(this === testClass1, "this should be bound to testClass1");
                callsMade++;
              };
            };
            var testClass1 = new TestClass1();
            var TestClass2 = function() {
              this.testFunc = function() {
                assert(this === testClass2, "this should be bound to testClass2");
                callsMade++;
              };
            };
            var testClass2 = new TestClass2();

            emitter.addListener("Test", base.bind(testClass1, "testFunc"));
            emitter.subscribe("Test", testClass2, "testFunc");
            emitter.emit("Test");
            assert(callsMade === 2, "there should be 2 calls executed");
          }
        );
      }
    );

    describe(
      "#listeners(type)",
      function() {
        it(
          "get the listeners",
          function() {
            var callsMade = 0;
            var TestClass1 = function() {
              this.testFunc = function() {
                callsMade++;
              };
            };
            var testClass1 = new TestClass1();
            var TestClass2 = function() {
              this.testFunc = function() {
                callsMade++;
              };
            };
            var testClass2 = new TestClass2();

            emitter.addListener("Test", base.bind(testClass1, "testFunc"));
            emitter.addListener("Test", base.bind(testClass2, "testFunc"));
            assert(emitter.listeners("Test"), "there should be listeners");
            assert(emitter.listeners("Test").length === 2, "there should be 2 listeners");
          }
        );
      }
    );
  }
);