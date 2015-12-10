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

jsio("import device as device");

describe(
  "device",
  function() {
    describe(
      "device.name",
      function() {
        it(
          "get the name of the device",
          function() {
            assert(device.name === "tealeaf", "the name of the device should be \"tealeaf\"");
          }
        );
      }
    );

    describe(
      "device.defaultFontFamily",
      function() {
        it(
          "get the default font family",
          function() {
            assert(device.defaultFontFamily === "Helvetica", "the default font family should be \"Helvetica\"")
          }
        );
      }
    );

    describe(
      "device.width",
      function() {
        it(
          "get the width of the device",
          function() {
            assert(device.width === 640, "the width of the device should be 640");
          }
        );
      }
    );

    describe(
      "device.height",
      function() {
        it(
          "get the height of the device",
          function() {
            assert(device.height === 480, "the height of the device should be 480");
          }
        );
      }
    );

    describe(
      "device.getDimensions()",
      function() {
        it(
          "get the dimensions of the device",
          function() {
            var dimensions = device.getDimensions();
            assert(dimensions.width === 480, "the width should be 480");
            assert(dimensions.height === 640, "the height should be 640");
          }
        );
      }
    );

    describe(
      "device.screen",
      function() {
        it(
          "get the screen",
          function() {
            assert(device.screen.devicePixelRatio === 1, "the devicePixelRatio should be 1");
          }
        );
      }
    );

    describe(
      "device.canResize",
      function() {
        it(
          "get the resize property",
          function() {
            assert(device.canResize === false, "the canResize property should be false");
          }
        );
      }
    );

    describe(
      "device.isMobile",
      function() {
        it(
          "get the isMobile property",
          function() {
            assert(device.isMobile === false, "the isMobile property should be false")
          }
        );
      }
    );

    describe(
      "device.isIOS",
      function() {
        it(
          "get the isIOS property",
          function() {
            assert(device.isIOS === false, "the isIOS property should be false")
          }
        );
      }
    );

    describe(
      "device.isAndroid",
      function() {
        it(
          "get the isAndroid property",
          function() {
            assert(device.isAndroid === false, "the isAndroid property should be false")
          }
        );
      }
    );

    describe(
      "device.isSafari",
      function() {
        it(
          "get the isSafari property",
          function() {
            assert(device.isSafari === false, "the isSafari property should be false")
          }
        );
      }
    );

    describe(
      "device.isMobileBrowser",
      function() {
        it(
          "get the isMobileBrowser property",
          function() {
            assert(device.isMobileBrowser === false, "the isMobileBrowser property should be false")
          }
        );
      }
    );

    describe(
      "device.isUIWebView",
      function() {
        it(
          "get the isUIWebView property",
          function() {
            assert(device.isUIWebView === false, "the isUIWebView property should be false")
          }
        );
      }
    );

    describe(
      "device.useDOM",
      function() {
        it(
          "get the useDOM property",
          function() {
            assert(device.useDOM === false, "the useDOM property should be false")
          }
        );
      }
    );

    describe(
      "device.setUseDOM",
      function() {
        it(
          "set the useDOM property",
          function() {
            device.setUseDOM(true);
            assert(device.useDOM === true, "the useDOM property should be true")
            device.setUseDOM(false); // Always restore for tests!!!!!
          }
        );
      }
    );

    describe(
      "device.events",
      function() {
        it(
          "check the device events",
          function() {
            var events = device.events;
            assert(events.start === "mousedown", "events.start should be \"mousedown\"")
            assert(events.move === "mousemove", "events.move should be \"mousemove\"")
            assert(events.end === "mouseup", "events.end should be \"mouseup\"")
          }
        );
      }
    );

    describe(
      "device.hideAddressBar",
      function() {
        it(
          "hide the address bar",
          function() {
            assert(device.hideAddressBar, "there should be a hideAddressBar function");
            device.hideAddressBar();
          }
        );
      }
    );
  }
);