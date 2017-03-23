import Image from './Image';

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
    }

    return img;
  }

}

export default new ImageViewCache();
