import ui.View as View;
import ui.ImageView as ImageView;
import ui.resource.Image as Image;

/* ScoreView.js
 * This class is designed for high performance text-rendering using images.
 * It is ideal for scores or other in-game counters that update often.
 */

exports = Class(View, function(supr) {

	this.init = function(opts) {
		opts.blockEvents = true;
		supr(this, 'init', arguments);

		// characters that should be rendered
		this.activeCharacters = [];
		this.imageViews = [];

		// container view for characters
		this._container = new View({
			superview: this,
			width: this.style.width,
			height: this.style.height,
			canHandleEvents: false
		});

		// get our image data and set up Images
		opts.characterData && this.setCharacterData(opts.characterData);

		// text options
		this.textAlign = opts.textAlign || 'center';
		this.spacing = opts.spacing || 0;
		this.srcHeight = opts.srcHeight;
		this.origScale = opts.scale || 1;

		if (opts.text) {
			this.setText(opts.text);
		}
	};

	this._loadCharacter = function(c) {
		var d = this.characterData[c];
		d.img = new Image({ url: d.image });
		if (!d.width || !this.srcHeight) {
			d.img.doOnLoad = bind(this, function() {
				d.width = d.width || d.img.getWidth();
				this.srcHeight = this.srcHeight || d.img.getHeight();
			});
		}
	};

	this.setCharacterData = function(data) {
		this.characterData = data;
		for (var c in data) {
			this._loadCharacter(c);
		}

		if (this.text) {
			this.setText(this.text);
		}
	};

	this.setText = function(text) {
		this.text = text = text + "";
		this.textWidth = 0;

		var scale = this.style.height / this.srcHeight;

		var i = 0, data;
		while (i < text.length) {
			var character = text.charAt(i);
			var data = this.characterData[character];
			var w = data.width * scale;
			if (data) {
				this.activeCharacters[i] = data;
				this.textWidth += w + this.spacing * scale;
				// special x offsets to fix text kerning only affect text width if it's first or last char
				if (data.offset && (i == 0 || i == text.length - 1)) {
					this.textWidth += data.offset * scale;
				}
			}
			i++;
		}

		if (this.style.width < this.textWidth) {
			this._container.style.scale = this.style.width / this.textWidth;
		} else {
			this._container.style.scale = this.origScale;
		}

		if (this.textAlign == 'center') {
			this.offset = (this.style.width - this.textWidth) / 2;
		} else if (this.textAlign == 'right') {
			this.offset = this.style.width - this.textWidth;
		} else {
			this.offset = 0;
		}

		while (text.length > this.imageViews.length) {
			var newView = new ImageView({
				superview: this._container,
				x: 0,
				y: 0,
				width: 1,
				height: 1,
				canHandleEvents: false,
				inLayout: false
			});
			newView.needsReflow = function() {};
			this.imageViews.push(newView);
		}

		// trim excess characters
		this.activeCharacters.length = text.length;

		var x = this.offset, y = 0;
		for (i = 0; i < this.activeCharacters.length; i++) {
			var data = this.activeCharacters[i];
			var view = this.imageViews[i];
			var w = data.width * scale;

			// special x offsets to fix text kerning
			if (data.offset) {
				x += data.offset * scale;
			}

			view.style.x = x;
			view.style.y = y;
			view.style.width = w;
			view.style.height = this.style.height; // all characters should have the same height
			view.style.visible = true;
			view.setImage(data.img);

			// remove special offset
			if (data.offset) {
				x -= data.offset * scale;
			}

			x += w + this.spacing * scale;
		}

		while (i < this.imageViews.length) {
			this.imageViews[i].style.visible = false;
			i++;
		}
	};

	this.needsReflow = function() {};
});