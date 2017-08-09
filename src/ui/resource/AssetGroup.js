import { logger, merge } from 'base';
import loader from 'ui/resource/loader';
import loaders from 'ui/resource/primitiveLoaders';

var loadImage = loaders.loadImage;

class AssetGroup {
  constructor (assetURLs, dependency, priority) {
    this._dependency = dependency || null;

    this._urls = [];
    this._loadMethods = [];
    this._ids = [];

    this._priority = priority;
    this._assetsById = {};
    this._loaded = false;

    for (var u = 0; u < assetURLs.length; u += 1) {
      this._addAsset(assetURLs[u]);
    }
  }

  _load (cb, contextualAssetsURLs) {
    if (this._loaded && (!contextualAssetsURLs || contextualAssetsURLs.length === 0)) {
      return cb && cb(this._assetsById);
    }

    var generatedAssetURLs;
    if (contextualAssetsURLs) {
      // adding contextual assets to group
      generatedAssetURLs = new Array(contextualAssetsURLs.length);
      for (var u = 0; u < contextualAssetsURLs.length; u += 1) {
        var url = contextualAssetsURLs[u];
        generatedAssetURLs[u] = this._addAsset(url);
      }
    }

    loader._loadAssets(this._urls, this._loadMethods,
      (assets) => {
        var assetsByID = this._assetsById;
        for (var a = 0; a < assets.length; a += 1) {
          var id = this._ids[a];
          var url = this._urls[a];
          var asset = assets[a];
          assetsByID[url] = asset;

          if (id) {
            // also mapping asset to its id, if any
            assetsByID[id] = asset;
          }
        }

        if (generatedAssetURLs) {
          // removing contextual assets from group
          for (var u = 0; u < generatedAssetURLs.length; u += 1) {
            this._removeAsset(generatedAssetURLs[u]);
          }
        }

        // currently all assets remain in cache forever
        // therefore an asset batch remains loaded forever
        this._loaded = true;

        return cb && cb(assetsByID);
      }, this._priority, true);
  }

  load (cb, contextualAssetsURLs) {
    var dependency = this._dependency;
    if (dependency) {
      dependency.load((depAssetsByID) => {
        this._load((assetsByID) => {
          return cb && cb(merge(depAssetsByID, assetsByID));
        }, contextualAssetsURLs);
      });

      return;
    }

    this._load(cb, contextualAssetsURLs);
  }

  // TODO: give more control over memory by adding possibility to unload group of assets
  // unload () {
    // this._loaded = false;
    // this._assetsById = {};
    // TODO: recursively unload unused dependencies
  // }

  _addAsset (url) {
    var id;
    var priority;
    var loadMethod;
    var blockImplicitRequests;
    // TODO: refactor this logic ?
    // type checking => method not fully optimized
    if (typeof url !== 'string') {
      id = url.id;
      priority = url.priority;
      loadMethod = url.loadMethod;
      url = url.url;
    }

    if (priority === undefined) { priority = this._priority; }
    if (!loadMethod) { loadMethod = loader._getLoadMethod(url); }

    if (loadMethod === loadImage) {
      url = loader._getImageURL(url);
    }

    this._urls.push(url);
    this._loadMethods.push(loadMethod);
    this._ids.push(id ? id : null);

    loader._waitForExplicitRequest[url] = true;
    loader._priorities[url] = priority;

    return url;
  }

  _removeAsset (url) {
    // TODO: optimize, bad algorithm complexity
    var idx = this._urls.indexOf(url);
    if (idx !== -1) {
      this._urls.splice(idx, 1);
      this._loadMethods.splice(idx, 1);
      this._ids.splice(idx, 1);
    }
  }
}


AssetGroup.constructURLs = function (pathPrefix) {
  return loader.constructURLs(pathPrefix);
}

AssetGroup.PRIORITY_LOW = loader.PRIORITY_LOW;
AssetGroup.PRIORITY_MEDIUM = loader.PRIORITY_MEDIUM;

export default AssetGroup;