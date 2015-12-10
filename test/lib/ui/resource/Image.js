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

jsio("import ui.resource.Image");

// image.setSrcImage (image) is listed twice
// setSrcImages is currently implemented as setSource
// image.setImageData (data)
// image.getImageData ()
// image.getMap () ----> remove getBounds

describe(
  "ui.resource.Image",
  function() {
    describe(
            "#constructor()",
          function() {
                it(
                  "creates an instance of ui.resource.Image",
                  function() {
                    var image = new ui.resource.Image({url: "test.png"});
                    assert(image instanceof ui.resource.Image, "image is an instance of ui.resource.Image");
                    }
                );
            }
        );

        describe(
            "#isReady()",
          function() {
                it(
                  "get the loading state of the image",
                  function(done) {
                    var image = new ui.resource.Image();
                    assert(!image.isReady(), "the image should not be ready");
                    image.setURL("test.png");
                    setTimeout(
                      function() {
                        assert(image.isReady(), "the image should be ready");
                        done();
                      },
                      50
                    );
                    }
                );
            }
        );

        describe(
            "#destroy()",
          function() {
                it(
                  "destroy the image",
                  function() {
                    var image = new ui.resource.Image();
                    image.destroy();
                    assert(!image.isReady(), "the image should not be ready after destroying");
                    }
                );
            }
        );

        describe(
            "#setSource(image)",
          function() {
                it(
                  "set the source image",
                  function() {
                    var image = new ui.resource.Image();
                    var srcImage = new Image();
                    srcImage.src = "testImage.png";
                    image.setSource(srcImage);
                    assert(image.getMap().width === 100, "the width of the image should be 100");
                    assert(image.getMap().height === 101, "the width of the image should be 101");
                    }
                );
            }
        );

        describe(
            "#getURL()",
          function() {
                it(
                  "get the url of the image",
                  function() {
                    var image = new ui.resource.Image({url: "test.png"});
                    assert(image.getURL() === "test.png", "the url of the image should be \"test.png\"");
                    }
                );
            }
        );

        describe(
            "#setURL(url)",
          function() {
                it(
                  "set the url of an image",
                  function(done) {
                    var image = new ui.resource.Image();
                    image.setURL("test.png");
                    image.doOnLoad(
                      function() {
                        done();
                      }
                    )
                    }
                );
            }
        );

    describe(
      "#getWidth()",
      function() {
        it(
          "get width of the image",
          function() {
            var image = new ui.resource.Image({url: "test.png"});
            assert(image.getWidth() === 100, "the width of the image should be 100");
          }
        );
      }
    );

    describe(
      "#getOrigWidth()",
      function() {
        it(
          "get original width of the image",
          function() {
            var image = new ui.resource.Image({url: "test.png"});
            assert(image.getOrigWidth() === 100, "the original width of the image should be 100");
          }
        );
      }
    );

    describe(
      "#getHeight()",
      function() {
        it(
          "get height of the image",
          function() {
            var image = new ui.resource.Image({url: "test.png"});
            assert(image.getHeight() === 101, "the height of the image should be 101");
          }
        );
      }
    );

    describe(
      "#getOrigHeight()",
      function() {
        it(
          "get original height of the image",
          function() {
            var image = new ui.resource.Image({url: "test.png"});
            assert(image.getOrigHeight() === 101, "the original height of the image should be 101");
          }
        );
      }
    );

    describe(
      "#getSource()",
      function() {
        it(
          "get the source image",
          function() {
            var image = new ui.resource.Image({url: "test.png"});
            assert(image.getSource().src === "test.png", "the url of the source image should be \"test.png\"");
            assert(image.getSource().isMock, "it should be a mock image");
          }
        );
      }
    );

    describe(
            "#getMap()",
          function() {
                it(
                  "get the bounds info",
                  function() {
                    var image = new ui.resource.Image({url: "test.png"});
                    var map = image.getMap();

                    assert.equal(map.width, 100, "width should be 100");
                    assert.equal(map.height, 101, "width should be 101");
                    assert.equal(map.scale, 1, "scale should be 1");
                    }
                );
            }
        );
  }
);
