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

jsio("import ui.View as View");
jsio("import ui.backend.canvas.ViewBacking as ViewBacking");
jsio("import animate as animate");

describe(
  "ui.animate",
  function() {
    var view;

    beforeEach(
      function() {
        view = new View({
          parent: app._view,
          x: 0,
          y: 0,
          width: 1,
          height: 1
        });
      }
    );

    describe(
      "#animate(subject, groupId)",
      function() {
        it(
          "creates an animation",
          function() {
            var a = animate(view, 1);
            assert(a, "a should be an animation");
            assert(a.id === '__anim_1', "a should animation 1");
          }
        );
      }
    );

    describe(
      "#animate.setViewAnimator(animator)",
      function() {
        it(
          "sets the view animator",
          function() {
            var TestAnimator = function() {
                this.isMockViewAnimator = true;
                this.hasFrames = function() { return false; };
              };
            var animator = animate.getViewAnimator();
            var view = new View();

            animate.setViewAnimator(TestAnimator);
            assert(view.getAnimation().isMockViewAnimator === true, "check if the animator is the mock animator");

            animate.setViewAnimator(animator);
          }
        );
      }
    );

    describe(
      "#animate.getGroup(id)",
      function() {
        it(
          "get the group from an animation",
          function() {
            var a = animate(view, 2);
            var group;

            group = animate.getGroup(100000);
            assert(!group, "this group should not be found");

            group = animate.getGroup(2);
            assert(group, "there should be a group");
          }
        );
      }
    );

    describe(
      "#animator.clear()",
      function() {
        it(
          "clear the animator",
          function() {
            var a = animate(view, 1);
            a.then(
              function() {
                assert(false, "this should not be executed");
              },
              100
            )
            a.clear();
          }
        );
      }
    );

    describe(
      "#animate.resume()",
      function() {
        it(
          "resumes an paused animation",
          function() {
            var a = animate(view, 1);
            a.then({x: 100}, 1000);
            a.pause();
            a.resume();
            assert(!a.isPaused(), "the animation should be resumed");
          }
        );
      }
    );

    describe(
      "#animator.pause(), #animator.resume()",
      function() {
        it(
          "pause the animator",
          function(done) {
            var a = animate(view, 1);
            var startTime = +Date.now();

            a.wait(100).then(
              function() {
                var time = +new Date();
                assert(time - startTime > 250, "the time should be at least 150ms");
                done();
              }
            );
            a.pause();
            setTimeout(
              function() {
                a.resume();
              },
              200
            );
          }
        );
      }
    );

    describe(
      "#animator.isPaused()",
      function() {
        it(
          "check if the animation is paused",
          function() {
            var a = animate(view, 1);
            a.wait(100).then(function() {});
            a.pause();
            assert(a.isPaused(), "the animation should be paused");
          }
        );
      }
    );

    describe(
      "#animate.wait(time)",
      function() {
        it(
          "wait and the call a callback",
          function(done) {
            var a = animate(view, 1);
            a.wait(40).then(
              function() {
                done();
              }
            );
          }
        );
      }
    );

    describe(
      "#animator.wait()",
      function() {
        it(
          "pause the animator",
          function(done) {
            var a = animate(view, 1);
            var startTime = +Date.now();

            a.wait(200).then(
              function() {
                var time = +new Date();
                assert(time - startTime > 190, "the time difference should be at least 190");
                done();
              }
            );
          }
        );
      }
    );

    describe(
      "#animate.now(target, duration, transition, onTick)",
      function(done) {
        it(
          "execute a callback immidiately",
          function(done) {
            var a = animate(view, 1);
            var tickCalled = false;
            a.now(
              {y: 110},
              100,
              animate.linear,
              function() {
                tickCalled = true;
              }
            );
            setTimeout(
              function() {
                assert(view.style.y === 110, "the y position should be 110");
                assert(tickCalled, "tick should have been called");
                done();
              },
              120
            )
          }
        );
      }
    );

    describe(
      "#animate.now(callback)",
      function() {
        it(
          "execute a callback immidiately",
          function(done) {
            var a = animate(view, 1);
            a.now(
              function() {
                done();
              }
            );
          }
        );
      }
    );

    describe(
      "#animate.then(callback)",
      function() {
        it(
          "call a callback",
          function(done) {
            var a = animate(view, 1);
            a.then(
              function() {
                done();
              }
            )
          }
        );
      }
    );

    describe(
      "#animate.then(target, duration, transition, onTick)",
      function() {
        it(
          "animate the x position",
          function(done) {
            var a = animate(view, 1);
            var tickCalled = false;
            a.then(
              {x: 100},
              100,
              animate.linear,
              function() {
                tickCalled = true;
              }
            ).then(
              function() {
                assert(view.style.x === 100, "x should be 100");
                assert(tickCalled, "tick should have been called");
                done();
              }
            )
          }
        );
      }
    );

    describe(
      "#animate.pause()",
      function() {
        it(
          "pauses an animation",
          function() {
            var a = animate(view, 1);
            a.then({x: 100}, 1000);
            a.pause();
            assert(a.isPaused(), "the animation should be paused");
          }
        );
      }
    );

    describe(
      "#animate.commit()",
      function() {
        it(
          "finishes the animation immediately",
          function(done) {
            var a = animate(view, 1);
            a.then({x: 100}, 1000);

            setTimeout(
              function() {
                a.commit();
                assert(view.style.x === 100, "the x position of the view should be 100");
                done();
              },
              100
            );
          }
        );
      }
    );

    describe(
      "#animate.debug()",
      function() {
        it(
          "turn debug information on",
          function() {
            var a = animate(view, 1);
            a.debug();
          }
        );
      }
    );

    describe(
      "Finish group event",
      function() {
        it(
          "call an event when the group is done",
          function(done) {
            var a = animate(view, "finishTest");
            a.then({x: 200}, 50);

            var isDone = false;
            animate.getGroup("finishTest").on(
              "Finish",
              function() {
                isDone = true;
                done();
              }
            );

            assert(!isDone, "the animation should not be done yet");
          }
        );
      }
    );
  }
);