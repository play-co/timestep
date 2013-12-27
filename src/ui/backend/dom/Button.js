/**
 * @license
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

import ui.backend.dom.TextView as TextView;

/**
 * @extends ui.backend.dom.TextView
 */
exports = Class(TextView, function (supr) {

	this.init = function (opts) {
		opts = merge(opts, {
			type: "plain",
			text: "CHANGE ME",
			color: 'white',
			shadow: true,
			'dom:className': "button"
		});

		supr(this, "init", [opts]);

		this._node.style.textShadow = 'black 2px 2px 2px';
		this.setText(opts.text);
	};

	this.onInputSelect = function () {
		this.publish('Select');
	}
});
