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

jsio('import ui.TextInputView as TextInputView');

describe(
  'ui.TextInputView',
  function() {
    var view = new TextInputView({prompt: ''});

        describe(
          '#constructor()',
          function() {
                it(
                  "creates an instance of TextInputView",
                  function() {
            assert(view instanceof TextInputView, "view is an instance of ui.TextInputView");
                    }
                );
            }
        );

    describe(
      "Event: InputSelect",
      function() {
        it(
          "is called when the TextInputView has been selected",
          function() {
            // var called = false;
            // view.subscribe("InputSelect", function() { called = true; });
            // view.onInputSelect();
            // assert(called, "InputSelect was called");
          }
        );
      }
    );
  }
);
