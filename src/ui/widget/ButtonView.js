/**
 * @class ui.widget.ButtonView
 *
 * @doc http://doc.gameclosure.com/api/ui-widget-buttonview.html
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/widget/buttonview.md
 */

import ui.ImageView as ImageView;

exports = Class(ImageView, function (supr) {
	var uid = 0,
			uidInput = null;

	this.init = function (opts) {
		supr(this, 'init', [opts]);

		if (!opts.imagePressed) {
			opts.imagePressed = opts.image;
		}

		this._uid = uid++;
		this._className = 'ButtonView';
		
		// sound up and down fns
		this.soundOnStart = opts.soundOnStart || function () {};
		this.soundOnEnd = opts.soundOnEnd || function () {};

		// button action
		this.onClick = opts.onClick || function () {};

		// only allow one click
		this.clickOnce = opts.clickOnce || false;
		this.hasBeenClicked = false;

		// pressed state subview offsets, i.e. text subview is lowered to look pressed
		this.pressedOffsetX = opts.pressedOffsetX || 0;
		this.pressedOffsetY = opts.pressedOffsetY || 0;

		// button states
		this.pressed = false;
	};

	this.onInputStart = function () {
		if (!this.pressed) {
			this.setImage(this._opts.imagePressed);
			this.pressed = true;
			this.soundOnStart();

			this.offsetSubviews();

			// save the currently depressed button at the class level
			uidInput = this._uid;
		}
	};

	this.onInputSelect = function (evt, srcPt) {
		if (this.clickOnce && this.hasBeenClicked) {
			return;
		}

		if (this.pressed && uidInput == this._uid) {
			this.setImage(this._opts.image);
			this.pressed = false;
			this.hasBeenClicked = true;
			this.soundOnEnd();
			this.onClick(evt, srcPt);
			this.emit('Click', evt, srcPt);

			this.onsetSubviews();

			// wipe our class level button state
			uidInput = null;
		}
	};

	this.onInputOut = function (over, overCount) {
		if (this.pressed) {
			this.setImage(this._opts.image);
			this.pressed = false;
			this.soundOnEnd();

			this.onsetSubviews();
			this.emit('InputOut', over, overCount);
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

		if (!dontPublish) {
			this.emit(stateName);
		}
	};

	this.reflow = function () {
		this._text.style.width = this.style.width;
		this._text.style.height = this.style.height;
	};

	this.onInputOver = function (over, overCount, atTarget) {
		if (!this.pressed && uidInput == this._uid) {
			this.setImage(this._opts.imagePressed);
			this.pressed = true;
			this.soundOnStart();

			this.offsetSubviews();
			this.emit('InputOver', over, overCount, atTarget);
		}
	};

	this.offsetSubviews = function () {
		var subviews = this.getSubviews();
		for (var i in subviews) {
			var view = subviews[i];
			view.style.x += this.pressedOffsetX;
			view.style.y += this.pressedOffsetY;
		}
	};

	this.onsetSubviews = function () {
		var subviews = this.getSubviews();
		for (var i in subviews) {
			var view = subviews[i];
			view.style.x -= this.pressedOffsetX;
			view.style.y -= this.pressedOffsetY;
		}
	};

	this.getTag = function () {
		return (this._className || 'ButtonView') + this.uid + (this.tag ? ':' + this.tag : '');
	};
});
