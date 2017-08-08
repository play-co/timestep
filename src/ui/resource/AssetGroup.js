import { logger } from 'base';
import loader from 'ui/resource/loader';


class AssetGroup {
	constructor (assetURLs, dependency, priority) {
		this._assetURLs = assetURLs;
		this._dependency = dependency || null;
		this._loader = loader.createGroup(assetURLs, null, true, priority);
		this._loaded = false;
	}

	_load (cb, contextualAssetsURLs) {
		if (this._loaded && (!contextualAssetsURLs || contextualAssetsURLs.length === 0)) {
			return cb && cb();
		}

		var groupLoader = this._loader;

		var generatedAssetURLs;
		if (contextualAssetsURLs) {
			// adding contextual assets to group
			generatedAssetURLs = new Array(contextualAssetsURLs.length);
			for (var u = 0; u < contextualAssetsURLs.length; u += 1) {
				generatedAssetURLs[u] = groupLoader.addAsset(contextualAssetsURLs[u]);
			}
		}

		var priority = this._loader.priority;
		groupLoader.load(() => {
			if (contextualAssetsURLs) {
				// removing contextual assets from group
				for (var u = 0; u < generatedAssetURLs.length; u += 1) {
					groupLoader.removeAsset(generatedAssetURLs[u]);
				}
			}

			// currently all assets remain in cache forever
			// therefore an asset batch remains loaded forever
			this._loaded = true;

			if (priority !== loader.PRIORITY_LOW) {
				return cb && cb();
			}
		});

		if (priority === loader.PRIORITY_LOW) {
			// triggering callback without waiting for assets to load
			return cb && cb();
		}
	}

	load (cb, contextualAssetsURLs) {
		var dependency = this._dependency;
		if (dependency) {
			dependency.load(() => this._load(cb, contextualAssetsURLs));
			return;
		}

		this._load(cb, contextualAssetsURLs);
	}

	// TODO: give more control over memory by adding possibility to unload group of assets
	// unload () {
		// this._loaded = false;
		// TODO: recursively unload unused dependencies
	// }
}


AssetGroup.constructURLs = function (pathPrefix) {
	return loader.constructURLs(pathPrefix);
}

AssetGroup.PRIORITY_LOW = loader.PRIORITY_LOW;
AssetGroup.PRIORITY_MEDIUM = loader.PRIORITY_MEDIUM;

export default AssetGroup;