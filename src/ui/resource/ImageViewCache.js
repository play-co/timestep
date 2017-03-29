import device from 'device';
import Image from './Image';
var Canvas = device.get('Canvas');

// helper canvases for image data, initialized when/if needed
var _halfsizeCanvas = null;
var _halfsizeContext = null;

/**
 * A cache of instances of ui/resource/Image
 *   NOTE: the ui/resource/Image Class is a wrapper for HTML5 Image;
 *         HTML5 images are cached in ui/resource/loader along w other resources
 */

class ImageViewCache {

  constructor () {
    this.cache = {};
  }

  clear () {
    this.cache = {};
  }

  getImage (url, forceReload) {
    var img;
    if (!forceReload) {
      img = this.cache[url];
    }

    if (!img) {
      img = this.cache[url] = new Image({
        url: url,
        forceReload: !!forceReload
      });

      img.__halfsize = () => { this.halfsize(img._srcImg, img._map); };
    }

    return img;
  }

  /**
   * NOTE: halfsize takes an HTMLImageElement and halfsizes it
   */
  halfsize (image, map) {
    this._prepCanvas();

    var w = image.width;
    var h = image.height;
    _halfsizeCanvas.width = w / 2;
    _halfsizeCanvas.height = h / 2;

    _halfsizeContext.drawImage(image, 0, 0, w, h, 0, 0, w / 2, h / 2);
    image.src = _halfsizeCanvas.toDataURL("image/png");

    map.x /= 2;
    map.y /= 2;
    map.width /= 2;
    map.height /= 2;
    map.scale /= 2;
    map.marginTop /= 2;
    map.marginRight /= 2;
    map.marginBottom /= 2;
    map.marginLeft /= 2;
  }

  _prepCanvas () {
    // initialize a shared imgDataCanvas when/if needed
    if (_halfsizeCanvas === null) {
      _halfsizeCanvas = new Canvas();
      _halfsizeContext = _halfsizeCanvas.getContext('2d');
    }
  }

}

export default new ImageViewCache();
