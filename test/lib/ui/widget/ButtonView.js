/* @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
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
