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

/**
 * @class ui.TextPromptView;
 * Implements a view that can accept input using the environment's InputPrompt.
 *
 * @doc http://doc.gameclosure.com/api/ui-text.html#class-ui.textpromptview
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/text.md
 */

import ui.TextView as TextView;
import device;

var InputPrompt = device.get('InputPrompt');

exports = Class(TextView, function (supr) {

	var defaults = {
		prompt: '',
		autoShowKeyboard: false
	};

	this.init = function (opts) {
		this._opts = merge(opts, defaults)

		supr(this, 'init', [this._opts]);

		this._prompt = new InputPrompt({
			prompt: this._opts.prompt,
			autoShowKeyboard: this._opts.autoShowKeyboard,
			onChange: bind(this, 'onChange')
		});
	};

	this.onInputSelect = function () {
		this._prompt.show();
		this.publish('InputSelect');
	};

	this.onChange = function (changeValue) {
		if (changeValue === null) {
			this.publish('Cancel');
		} else {
			var value = this._prompt.getValue();
			if (value !== this.getText()) {
				this.setText(value);
				this.publish('Change', value);
			}
		}
	};

	this.setPrompt = function (prompt) {
		this._prompt.setMessage(prompt);
	};

	this.showPrompt = function () {
		this._prompt.show();
	};
});
