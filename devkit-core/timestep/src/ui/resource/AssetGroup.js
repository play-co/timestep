import loader from 'ui/resource/loader';
import loaders from 'ui/resource/primitiveLoaders';
import { logger } from 'base';

var loadImage = loaders.loadImage;

class ProgressStats {
  constructor () {
    this.nbLoaded = 0;
    this.total = 0;
  }
}

export default class AssetGroup {
  constructor (assetURLs, dependency, priority) {
    this._dependency = dependency || null;

    this._ids = [];
    this._urls = [];
    this._loadMethods = [];

    this._priority = priority;
    this._assetsByID = {};
    this._identifiedURLs = {};
    this._loaded = false;
    this._loading = false;
    this._progress = 0;
    this._nbRequests = 0;

    for (var u = 0; u < assetURLs.length; u += 1) {
      this.addAsset(assetURLs[u]);
    }
  }

  get loaded () {
    return this._loaded;
  }

  get nextProgress () {
    // returns progress that will be achieved once next asset is loaded
    var progressStats = new ProgressStats();
    this._updateProgress(progressStats);
    return Math.min(1, (progressStats.nbLoaded + 1) / progressStats.total);
  }

  get progress () {
    var progressStats = new ProgressStats();
    this._updateProgress(progressStats);
    return progressStats.nbLoaded / progressStats.total;
  }

  _updateProgress (progressStats) {
    progressStats.nbLoaded += this._progress;
    progressStats.total += this._nbRequests;

    if (this._dependency) {
      this._dependency._updateProgress(progressStats);
    }
  }

  _load (cb, contextualAssetsURLs) {
    if (this._loading) {
      logger.warn('Asset group is already loading');
    }

    if (this._loaded && (!contextualAssetsURLs || contextualAssetsURLs.length === 0)) {
      return cb && cb(this._assetsByID);
    }

    var urls, loadMethods, ids;
    if (contextualAssetsURLs) {
      // adding contextual assets to group
      ids = this._ids.slice();
      urls = this._urls.slice();
      loadMethods = this._loadMethods.slice();
      for (var u = 0; u < contextualAssetsURLs.length; u += 1) {
        this._addAsset(contextualAssetsURLs[u], ids, urls, loadMethods);
      }
    } else {
      ids = this._ids;
      urls = this._urls;
      loadMethods = this._loadMethods;
    }

    this._loaded = false;
    this._loading = true;
    this._progress = 0;
    this._nbRequests = urls.length;
    loader._loadAssets(urls, loadMethods,
      (assets) => {
        var assetsByID = this._assetsByID = {};
        for (var a = 0; a < assets.length; a += 1) {
          var id = ids[a];
          var url = urls[a];
          var asset = assets[a];
          assetsByID[url] = asset;

          if (id) {
            // also mapping asset to its id, if any
            assetsByID[id] = asset;
          }
        }

        // currently all assets remain in cache forever
        // therefore an asset batch remains loaded forever
        this._loaded = true;
        this._loading = false;

        return cb && cb(assetsByID);
      }, this._priority, true, () => { this._progress += 1; });
  }

  load (cb, contextualAssetsURLs) {
    if (this._dependency) {
      this._dependency.load((depAssetsByID) => {
        this._load((assetsByID) => {
          for (var assetID in depAssetsByID) {
            assetsByID[assetID] = depAssetsByID[assetID];
          }
          return cb && cb(assetsByID);
        }, contextualAssetsURLs);
      });

      return;
    }

    this._load(cb, contextualAssetsURLs);
  }

  getAssetURL (assetID) {
    var url = this._identifiedURLs[assetID];
    if (!url && this._dependency) {
      url = this._dependency.getAssetURL(assetID);
    }
    return url;
  }

  // TODO: give more control over memory by adding possibility to unload group of assets
  // unload () {
    // this._loaded = false;
    // this._assetsByID = {};
    // TODO: recursively unload unused dependencies
  // }

  addAsset (url) {
    return this._addAsset(url, this._ids, this._urls, this._loadMethods);
  }

  _addAsset (url, ids, urls, loadMethods) {
    var id, priority, loadMethod;
    // TODO: refactor this logic ?
    // type checking => method not fully optimized
    if (typeof url !== 'string') {
      id = url.id;
      priority = url.priority;
      loadMethod = url.loadMethod;
      url = url.url;
      this._identifiedURLs[id] = url;
    }

    // Ugly temporary fix to properly load low res spritesheets
    // TODO: remove this logic and properly create loading group in game
    if (loader.LOW_RES_ENABLED
      && url.indexOf('spritesheets/') === 0
      && url.indexOf('spritesheets/low_res_') === -1) {
      url = 'spritesheets/low_res_' + url.substr(13);
    }

    if (priority === undefined) { priority = this._priority; }
    if (!loadMethod) { loadMethod = loader._getLoadMethod(url); }

    if (loadMethod === loadImage) {
      url = loader._getImageURL(url);
    }

    ids.push(id ? id : null);
    urls.push(url);
    loadMethods.push(loadMethod);

    loader._priorities[url] = priority;

    return url;
  }
}

AssetGroup.constructURLs = function (pathPrefix) {
  return loader.constructURLs(pathPrefix);
};

AssetGroup.PRIORITY_LOW = loader.PRIORITY_LOW;
AssetGroup.PRIORITY_MEDIUM = loader.PRIORITY_MEDIUM;
