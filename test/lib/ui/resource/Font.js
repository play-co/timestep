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

jsio('import ui.resource.Font as Font');

describe(
  "ui.resource.Font",
  function() {
    var font = new Font({
        name: "Verdana",
        size: "36px",
        weight: "bold"
      });

        describe(
          "#constructor()",
          function() {
                it(
                  "creates an instance of ui.resource.Font",
                  function() {
            assert(font instanceof Font, "font is an instance of ui.resource.Font");
                    }
                );
            }
        );

        describe(
          "#getName()",
          function() {
                it(
                  "get the name of the font",
                  function() {
            assert(font.getName() === "Verdana", "the name of the font should be \"Verdana\"");
                    }
                );
            }
        );

        describe(
          "#getSize()",
          function() {
                it(
                  "get the size of the font",
                  function() {
            assert(font.getSize() === 36, "the size of the font should be 36");
                    }
                );
            }
        );

        describe(
          "#getWeight()",
          function() {
                it(
                  "get the weight of the font",
                  function() {
            assert(font.getWeight() === "bold", "the weight of the font should be bold");
                    }
                );
            }
        );

        describe(
          "Font.parse(font)",
          function() {
                it(
                  "parse a font",
                  function() {
                    var parsedFont = Font.parse("bold 20px Courier New");
            assert(parsedFont.sizePx === 20, "the font size should be 20");
            assert(parsedFont.sizePt === 15, "the font size should be 15 pt");
            assert(parsedFont._name === "Courier New", "the font name should be \"Couries New\"");
            assert(parsedFont._style === "normal", "the font style should be \"normal\"");
            assert(parsedFont._weight === "bold", "the font weight should be \"bold\"");
            assert(parsedFont.size.value === 20, "the font size value should be 20");
            assert(parsedFont.size.unit === "px", "the font size unit should be \"px\"");
                    }
                );
            }
        );
  }
);
