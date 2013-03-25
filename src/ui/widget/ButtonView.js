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

import ui.View as View;
import ui.ImageView as ImageView;
import ui.ImageScaleView as ImageScaleView;
import ui.TextView as TextView;

import AudioManager;
import lib.Enum as Enum;

var states = Enum(
	"UP",
	"DOWN",
	"DISABLED",
	"SELECTED",
	"UNSELECTED"
);

var ButtonView = exports = Class(ImageScaleView, function (supr) {
	var selected = false;

	this.init = function (opts) {
		this._state = opts.defaultState || opts.state || states.UP;

		supr(this, "init", arguments);

		var textOpts = merge(
			opts.text,
			{
				superview: this,
				text: opts.title || "",
				x: 0,
				y: 0
			}
		);
		this._text = new TextView(textOpts);

		var iconOpts = merge(
			opts.icon,
			{
				superview: this,
				x: 0,
				y: 0
			}
		);
		this._icon = new ImageView(iconOpts);

		this.updateOpts(opts);
		this._trigger(this._state, true);
	};

	this.updateOpts = function (opts) {
		opts = merge(opts, this._opts);

		opts = supr(this, "updateOpts", [opts]);

		this._opts = opts;
		this._images = opts.images;
		this._onHandlers = opts.on || {};
		this._audioManager = opts.audioManager;
		this._sounds = opts.sounds;

		("text" in opts) && this._text && this._text.updateOpts(opts.text);
	};

	this.onInputStart = function () {
		//no action when disabled
		if (this._state === states.DISABLED) {
			return;
		}

		this._state = states.DOWN;
		this._trigger(states.DOWN);
	};

	this.onInputSelect = function () {
		//no action when disabled
		if (this._state === states.DISABLED) {
			return;
		}

		if (this._state !== states.DISABLED) {
			//call the click handler
			this._opts.onClick && this._opts.onClick.call(this);
			this.onClick && this.onClick();
		}

		if (this._opts.clickOnce) {
			this._state = states.DISABLED;
			this._trigger(states.UP);
			this._trigger(states.DISABLED);
			return;
		}

		if (this._opts.toggleSelected) {
			if (!selected) {
				this._trigger(states.SELECTED);
				selected = true;
			} else {
				this._trigger(states.UNSELECTED);
				selected = false;
			}
		}

		this._trigger(states.UP);
	};

	this.onInputOut = function () {
		if (this._state !== states.UP) {
			this._state = states.UP;
			this._trigger(states.UP, true);
		}
	};

	//when this function is called from the constructor the dontPublish parameter to prevent publishing events on create...
	this._trigger = function (state, dontPublish) {
		var stateName = states[state];
		if (!stateName) return;
		stateName = stateName.toLowerCase();

		if (this._images && this._images[stateName]) {
			this.setImage(this._images[stateName]);
		}
		if (dontPublish) {
			return;
		}

		if (typeof this._onHandlers[stateName] === "function") {
			this._onHandlers[stateName].call(this);
		}
		if (this._sounds && this._sounds[stateName]) {
			this._audioManager && this._audioManager.play(this._sounds[stateName]);
		}

		this.emit(stateName);
	};

	this.reflow = function () {
		this._text.style.width = this.style.width;
		this._text.style.height = this.style.height;
	};

	this.getText = function () {
		return this._text;
	};

	this.setTitle = function (title) {
		this._text.setText(title);
	};

	this.getIcon = function () {
		return this._icon;
	};

	this.setIcon = function (icon) {
		this._icon.setImage(icon);
	};

	this.setState = function (state) {
		var stateName = states[state];
		if (!stateName) return;

		this._state = state;
		stateName = stateName.toLowerCase();
		this.setImage(this._images[stateName]);
	};
});

ButtonView.states = states;
