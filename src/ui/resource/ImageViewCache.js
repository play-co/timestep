import .Image;

// cache of Images for ImageView and ImageScaleView
exports.cache = {};

exports.clear = function () {
  exports.cache = {};
}

exports.getImage = function (url, forceReload) {
  var img;
  if (!forceReload) {
    img = exports.cache[url];
  }

  if (!img) {
    img = exports.cache[url] = new Image({
      url: url,
      forceReload: !!forceReload
    });
  }

  return img;
};
