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

jsio('import Sound');

describe(
  'Sound',
  function() {
    var sound;

    beforeEach(
      function() {
                sound = new Sound({path: ''});
            }
    );

    // Init
        describe(
          "#constructor()",
          function() {
                it(
                  "creates an instance of Sound",
                  function() {
            assert(sound instanceof Sound, "a is an instance of Sound");
                    }
               );
          }
        );

    // Options
    describe(
      "#setPath(name)",
      function() {
        it(
          "sets the directory path that contains the audio files",
          function() {
            sound.setPath("resources/sounds/music");
            assert(sound.getPath() === "resources/sounds/music", "options.path = \"resources/sounds/music\"")
          }
        )
            }
    );

    describe(
      "#addSound(name, options)",
      function() {
        it(
          "add a sound and check if its set",
          function() {
            sound.addSound("boink", {loop: true});
            assert(sound._sounds.boink, "sound is set");
          }
        );
      }
    );

    describe(
      "#play(name, options)",
      function() {
        it(
          "play a sound",
          function() {
            sound.addSound("boink", {loop: true});
            assert(sound.play("boink"), "sound is playing");
          }
        );
      }
    );

    describe(
      "#play(name, options)",
      function() {
        it(
          "try to play a sound",
          function() {
            assert(!sound.play("no boink"), "sound is not playing");
          }
        );
      }
    );

    describe(
      "#pause(name)",
      function() {
        it(
          "pause a sound",
          function() {
            sound.addSound("boink", {loop: true});
            assert(sound.pause("boink"), "sound is paused");
          }
        );
      }
    );

    describe(
      "#pause(name)",
      function() {
        it(
          "try to pause a sound",
          function() {
            assert(!sound.pause("not boink"), "sound is not paused");
          }
        );
      }
    );

    describe(
      "#stop(name)",
      function() {
        it(
          "stop a sound",
          function() {
            sound.addSound("boink", {loop: true});
            assert(sound.stop("boink"), "sound is stopped");
          }
        );
      }
    );

    describe(
      "#stop(name)",
      function() {
        it(
          "try to stop a sound",
          function() {
            assert(!sound.stop("no boink"), "sound is not stopped");
          }
        );
      }
    );

    describe(
      "#setVolume(name, volume)",
      function() {
        it(
          "set the volume of a sound",
          function() {
            sound.addSound("boink", {loop: true});
            assert(sound.setVolume("boink", 1), "set sound volume");
          }
        );
      }
    );

    describe(
      "#setVolume(name, volume)",
      function() {
        it(
          "try to set the volume of a sound",
          function() {
            assert(!sound.setVolume("no boink", 1), "sound volume not set");
          }
        );
      }
    );

    describe(
      "#getVolume(name)",
      function() {
        it(
          "get the volume of a sound",
          function() {
            sound.addSound("boink", {loop: true});
            sound.setVolume("boink", 1);
            assert(sound.getVolume("boink") === 1, "get sound volume");
          }
        );
      }
    );

    describe(
      "#getVolume(name)",
      function() {
        it(
          "try to get the volume of a sound",
          function() {
            assert(sound.getVolume("no boink") === null, "no sound volume");
          }
        );
      }
    );

    describe(
      "#setMuted(isMuted)",
      function() {
        it(
          "set muted",
          function() {
            sound.setMuted(true);
            assert(sound.getMuted(), "sound is muted");
          }
        );
      }
    );

    describe(
      "#getMuted()",
      function() {
        it(
          "get muted",
          function() {
            assert(!sound.getMuted(), "sound is not muted");
          }
        );
      }
    );

    describe(
      "#setMusicMuted(isMuted)",
      function() {
        it(
          "set music muted",
          function() {
            sound.setMusicMuted(true);
            assert(sound.getMusicMuted(), "music is muted");
          }
        );
      }
    );

    describe(
      "#getMusicMuted()",
      function() {
        it(
          "get music muted",
          function() {
            assert(!sound.getMuted(), "music is not muted");
          }
        );
      }
    );

    describe(
      "#setEffectsMuted(areEffectsMuted)",
      function() {
        it(
          "set effects muted",
          function() {
            sound.setEffectsMuted(true);
            assert(sound.getEffectsMuted(), "effects are muted");
          }
        );
      }
    );

    describe(
      "#getEffectsMuted()",
      function() {
        it(
          "get effects muted",
          function() {
            assert(!sound.getEffectsMuted(), "effects are not muted");
          }
        );
      }
    );

    describe(
      "#getExt()",
      function() {
        it(
          "get ext",
          function() {
            assert(sound.getExt() === ".mp3", "is ext mp3");
          }
        );
      }
    );
  }
);
