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

jsio('import ui.ImageScaleView as ImageScaleView');
jsio('import ui.resource.Image');

describe(
  "ui.ImageScaleView",
  function() {
    var view;

    describe(
      "#constructor()",
      function() {
        it(
          "creates an instance of ImageScaleView",
          function() {
            var view = new ImageScaleView({});
            assert(view instanceof ImageScaleView, "view is an instance of ui.ImageScaleView");
          }
        );
      }
    );

    describe(
      "#updateOpts(opts)",
      function() {
        it(
          "set the opts",
          function() {
            var view = new ImageScaleView({});
            view.updateOpts({
              sourceSlices: {
                horizontal: {left: 10, center: 11, right: 12},
                vertical: {top: 13, middle: 14, bottom: 15}
              },
              destSlices: {
                horizontal: {left: 16, right: 17},
                vertical: {top: 18, bottom: 19}
              }
            });

            assert.deepEqual(view._sourceSlicesHor, [10, 11, 12], "source slices hor should be: 10, 11, 12");
            assert.deepEqual(view._sourceSlicesVer, [13, 14, 15], "source slices ver should be: 13, 14, 15");
            assert.deepEqual(view._destSlicesHor, [16, 0, 17], "dest slices ver should be: 16, 0, 17");
            assert.deepEqual(view._destSlicesVer, [18, 0, 19], "dest slices ver should be: 18, 0, 19");
          }
        );
      }
    );

    describe(
      "#setImage(img, opts)",
      function() {
        it(
          "set the image",
          function(done) {
            var view = new ImageScaleView({});
            view.setImage("test.png");
            view.doOnLoad(
              function() {
                assert(view.getOrigWidth() === 100, "the image width should be 100");
                assert(view.getOrigHeight() === 101, "the image height should be 101");
                done();
              }
            );
          }
        );
      }
    );

    describe(
      "#getOrigWidth()",
      function() {
        it(
          "get the original width of the image",
          function(done) {
            var view = new ImageScaleView({image: "test.png"});
            view.doOnLoad(
              function() {
                assert(view.getOrigWidth() === 100, "the image width should be 100");
                done();
              }
            );
          }
        );
      }
    );

    describe(
      "#getOrigHeight()",
      function() {
        it(
          "get the original height of the image",
          function(done) {
            var view = new ImageScaleView({image: "test.png"});
            view.doOnLoad(
              function() {
                assert(view.getOrigHeight() === 101, "the image height should be 101");
                done();
              }
            );
          }
        );
      }
    );

    describe(
      "#getImage()",
      function() {
        it(
          "get the image",
          function(done) {
            var view = new ImageScaleView({});
            view.setImage("testGetImage.png");
            view.doOnLoad(
              function() {
                var image = view.getImage();
                assert(image instanceof ui.resource.Image, "the image should be an instance of ui.resource.Image");
                assert(image.getMap().url === "testGetImage.png", "the image url should be \"testGetImage.png\"");
                done();
              }
            );
          }
        );
      }
    );
  }
);