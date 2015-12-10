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

jsio('import ui.widget.ButtonView as ButtonView');

describe(
  "ui.widget.ButtonView",
  function() {
    var button;

    describe(
      "#constructor()",
      function() {
        it(
          "creates an instance of ButtonView",
          function() {
            var button = new ButtonView({});
            assert(button instanceof ButtonView, "button is an instance of ui.widget.ButtonView");
          }
        );
      }
    );

    describe(
      "#onInputSelect()",
      function() {
        it(
          "click the button",
          function() {
            var clicked = false;
            var button = new ButtonView({onClick: function() { clicked = true; }});
            button.onInputStart({}, {});
            button.onInputSelect({}, {});
            assert(clicked, "button should be clicked");
          }
        );
      }
    );

    describe(
      "#onInputSelect()",
      function() {
        it(
          "click the button",
          function() {
            var clicked = false;
            var button = new ButtonView({});
            button.subscribe("Click", function() { clicked = true; });
            button.onInputStart({}, {});
            button.onInputSelect({}, {});
            assert(clicked, "button should be clicked");
          }
        );
      }
    );
  }
);
