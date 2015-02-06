import device;
import ui.ImageScaleView as ImageScaleView;
import ui.resource.Image as Image;
import lib.Callback;

exports = Class(ImageScaleView, function (supr) {
  this._drawcb = new lib.Callback();

  this.updateOpts = function (opts) {
    opts = supr(this, 'updateOpts', arguments);

    if (opts.image) {
      this.setImage(opts.image);
    }

    if (opts.defaultImage) {
      this._defaultImage = new Image({url: opts.defaultImage});
    }

    if (opts.mask) {
      this.setMask(opts.mask);
    }

    return opts;
  };

  this.setImage = function (img, opts) {
    this._drawcb.reset();
    if (this._currentImage && this._changeFunc) {
      this._currentImage.removeListener('urlChanged', this._changeFunc);
    }

    if (typeof img === 'string') {
      this._currentImage = new Image({url: img});
    } else {
      this._currentImage = img;
    }

    if (!this._subscriptionsSet) {
      this._subscriptionsSet = true;
    }

    this._compositeImage();
    this._changeFunc = bind(this, '_compositeImage');

    if (this._currentImage) {
      this._currentImage.on('urlChanged', this._changeFunc);
    }
  };

  this.setMask = function (mask) {
    this._mask = new Image({url: mask});
    this._compositeImage();
  };

  this._compositeImage = function () {
    if (!this._mask || !this._currentImage) {
      return;
    }

    if (this._defaultImage) {
      // first make sure the mask image is loaded
      this._mask.reload(bind(this, function () {
        var _loaded = false;

        this._currentImage.reload(bind(this, function (img) {
          // if _currentImage is already loaded, we'll get the
          // reload event in 1 frame and clear the default timeout
          // immediately before we render the default image
          _loaded = true;

          if (img === this._currentImage) {
            this._drawImage(img);
          }
        }, this._currentImage));

        this._defaultImage.reload(bind(this, function () {
          if (!_loaded) {
            this._drawImage(this._defaultImage);
          }
        }));
      }));
    } else {
      var cb = new lib.Callback();
      this._mask.reload(cb);
      this._currentImage.reload(cb);
      cb.run(this, function (img) {
        // Only composite the image if it is still the current image
        if (img === this._currentImage) {
          this._drawImage(img);
        }
      }, this._currentImage);
    }
  };

  this._onCanvasLost = function() {
    logger.log('{maskedImageView} My canvas got lost:',
               this._currentImage && this._currentImage.getURL());

    // Recomposite the image
    this._compositeImage();
  };

  this.doOnDraw = function () {
    this._drawcb.forward(arguments);
    return this;
  };

  // This returns the rectangle that should be used to draw an image with a
  // given width/height into a bounds with given width/height. This returned
  // rectangle accounts for the common scale methods used by ImageScaleView
  // (cover and contain).
  this._getImageDrawRect =
    function (imageWidth, imageHeight, boundsWidth, boundsHeight) {
    var x = 0;
    var y = 0;
    var width = boundsWidth;
    var height = boundsHeight;
    if (this._scaleMethod === 'cover' || this._scaleMethod === 'contain') {
      var boundsRatio = boundsWidth / boundsHeight;
      var imageRatio = imageWidth / imageHeight;
      if ((this._scaleMethod === 'cover' && imageRatio < boundsRatio)
          || (this._scaleMethod === 'contain' && imageRatio > boundsRatio)) {
        height = imageHeight * (boundsWidth / imageWidth);
        y = (boundsHeight - height) / 2;
      } else {
        width = imageWidth * (boundsHeight / imageHeight);
        x = (boundsWidth - width) / 2;
      }
    }
    return { x: x, y: y, width: width, height: height};
  };

  this._drawImage = function (img) {
    var mask = this._mask;
    var imgWidth = mask.getWidth();
    var imgHeight = mask.getHeight();

    // create a canvas and get the context if this has not been done yet
    if (!this.maskCanvas ||
        imgWidth !== this.maskCanvas.width ||
          imgHeight !== this.maskCanvas.height) {
      var Canvas = device.get('Canvas');
      this.maskCanvas = new Canvas({ width: imgWidth, height: imgHeight });
    }

    var ctx = this.maskCanvas.getContext('2D', bind(this, this._onCanvasLost));

    supr(this, 'setImage', [new Image({srcImage: this.maskCanvas})]);

    ctx.clear();

    // render the mask first
    ctx.globalCompositeOperation = 'copy';
    mask.render(ctx, 0, 0, imgWidth, imgHeight);

    // multiply the users profile image by the alpha in the mask image
    ctx.globalCompositeOperation = 'source-atop';

    var imgRect = this._getImageDrawRect(img.getWidth(),
                                         img.getHeight(),
                                         imgWidth,
                                         imgHeight);
    img.render(ctx, imgRect.x, imgRect.y, imgRect.width, imgRect.height);
    setTimeout(bind(this, function() {
      this._drawcb.fire();
    }), 1000);
  };
});

