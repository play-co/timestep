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

jsio('import ui.ImageView as ImageView');
jsio('import ui.resource.Image');

describe(
  "ui.ImageView",
  function() {
    var view;

    beforeEach(
      function() {
        view = new ImageView({image: "test.png", width: 50, height: 67});
      }
    );

    describe(
          "#constructor()",
          function() {
                it(
                  "creates an instance of ImageView",
                  function() {
            assert(view instanceof ImageView, "view is an instance of ui.ImageView");
                    }
                );
            }
        );

        describe(
          "#getImage()",
          function() {
                it(
                  "get the image",
                  function() {
                    assert(view.getImage(), "getImage should return an object");
                    assert(view.getImage().getSource(), "getImage().getSource should return an object");
                    assert(view.getImage().getSource().isMock, "getImage().getSource().isMock should be true");
                    }
                );
            }
        );

        describe(
          "#setImage(url)",
          function() {
                it(
                  "set the image",
                  function() {
                    view.setImage("anotherImage.png");
                    assert(view.getImage().getSource().url === "anotherImage.png", "the url should be \"anotherImage.png\"");
                    }
                );
            }
        );

        describe(
          "#setImage(img)",
          function() {
                it(
                  "set the image",
                  function() {
                    view.setImage(new ui.resource.Image({url: "anotherImage.png"}));
                    assert(view.getImage().getSource().url === "anotherImage.png", "the url should be \"anotherImage.png\"");
                    }
                );
            }
        );

        describe(
          "#doOnLoad(callback)",
          function() {
                it(
                  "test the on load callback",
                  function(done) {
                    view.doOnLoad(
                      function() {
                        done();
                      }
                    );
                    view.setImage("anotherImage.png");
                    }
                );
            }
        );

        describe(
          "#autoSize()",
          function() {
                it(
                  "size the view to the size of the image",
                  function() {
                    assert(view.style.width === 50, "the initial view width should be 50");
                    assert(view.style.height === 67, "the initial view height should be 67");
                    view.autoSize();
                    assert(view.style.width === 100, "the view width should be 100");
                    assert(view.style.height === 101, "the view height should be 101");
                    }
                );
            }
        );

        describe(
          "#getOrigWidth()",
          function() {
                it(
                  "get width of the image",
                  function() {
                    assert(view.getOrigWidth() === 100, "the width of the image should be 100");
                    }
                );
            }
        );

        describe(
          "#getOrigHeight()",
          function() {
                it(
                  "get height of the image",
                  function() {
                    assert(view.getOrigHeight() === 101, "the height of the image should be 101");
                    }
                );
            }
        );
  }
);
