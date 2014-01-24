/**
 * @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

import lib.Callback;

var _cache = {};

var MIME = {
	'.png': 'image',
	'.jpg': 'image',
	'.bmp': 'image',
	'.css': 'css',
	'.html': 'html',
	'.mp3': 'audio',
	'.ogg': 'audio',
	'.mp4': 'audio',
	'.3gp': 'audio',
	'.m4a': 'audio',
	'.aac': 'audio',
	'.flac': 'audio',
	'.mkv': 'audio',
	'.wav': 'audio'
};

var Loader = Class(function () {
	this._map = {};

	this.getMap = function () { return this._map; }
	this.setMap = function (map) { 
		var localizedMap = {};
		// For any resource staring with resource-local/ change the path to be resources/
		// This allows localized resources to be loaded the same way for all languages
		var language = navigator.language && navigator.language.split('-')[0].toLowerCase() || 'en';
		var localResources = 'resources-' + language;
		var shortLocalResources = 'resources-' + language.split('_')[0];
		for (var key in map) {
			var localLoc = key.indexOf(localResources);
			var shortLocalLoc = key.indexOf(shortLocalResources);
			// Favor an exact match of the local and then try to match the short local
			if (localLoc == 0) {
				var modifiedPath = 'resources' + key.substring(localResources.length);
				localizedMap[modifiedPath] = map[key];
			} else if (shortLocalLoc == 0) {
				var modifiedPath = 'resources' + key.substring(shortLocalResources.length);
				localizedMap[modifiedPath] = map[key];
			}else {
				localizedMap[key] = map[key];
			}
		}
		this._map = localizedMap; 
	}
	
	// TODO: rename this function...
	this.get = function (file) {
		return 'resources/images/' + file;
	}
	
	/**
	 * Preload a given resource or array of resources.
	 * You can specify a folder name, or even a partial filename,
	 * to preload all resources that begin with that prefix.
	 * For instance, in a tree like so:
	 * 
	 * resources
	 * └── images
     *     ├── boss
     *     │   ├── enemy1.png
	 *     │   └── enemy2.png
     *     └── hero
     *         ├── shield.png
	 *         └── sword.png
	 * 
	 * You could preload both enemy images in either of the following
	 * ways:
	 * 
	 *     ui.resource.loader.preload("resources/images/boss/");
	 *     ui.resource.loader.preload("resources/images/boss/enemy");
	 * 
	 * Pass an array of paths to preload all at once. The callback
	 * will be called when all resources have finished loading.
	 * 
	 * This works for both images and sounds.
	 */
	this.preload = function (pathPrefix, opts, cb) {
		if (typeof opts == 'function') {
			cb = opts;
			opts = undefined;
		}

		// process an array of items, where cb is run at completion of the final one
		if (isArray(pathPrefix)) {
			var chainCb = new lib.Callback();
			pathPrefix.forEach(function (prefix) {
				if (prefix) {
					this.preload(prefix, opts, chainCb.chain());
				}
			}, this);
			cb && chainCb.run(cb);
			return chainCb;
		} else {
			pathPrefix = pathPrefix.replace(/^\//, ''); // remove leading slash
			// if an item is found in the map, add that item's sheet to the group.
			// If there is no sheet in the map (i.e. for sounds), load that file directly.
			var preloadSheets = {};
			var map = this._map;
			for (var uri in map) {
				if (uri.indexOf(pathPrefix) == 0) {
					// sprites have sheet; sounds are just by the filename key itself
					preloadSheets[map[uri] && map[uri].sheet || uri] = true;
				}
			}
			
			var files = Object.keys(preloadSheets);

			// If no files were specified by the preload command,
			if (files.length == 0) {
				logger.log("WARNING: No files to preload from path:", pathPrefix, "-- A gamedev needs to update the code with the real resource paths.");
			}

			var callback = this._loadGroup(merge({resources: files}, opts));
			cb && callback.run(cb);
			return callback;
		}
	};

	var soundLoader = null;
	this.getSound = function (src) {
		if (!soundLoader) {
			import AudioManager;
			soundLoader = new AudioManager();
		}

		if (GLOBAL.NATIVE && GLOBAL.NATIVE.sound && GLOBAL.NATIVE.sound.preloadSound) {
			return NATIVE.sound.preloadSound(src);
		} else {
			soundLoader.addSound(src);
			//HACK to make the preloader continue in the browser
			return { complete: true };
		}
	}

	this.getImagePaths = function (prefix) {
		prefix = prefix.replace(/^\//, ''); // remove leading slash
		var images = [];
		var map = this._map;
		for (var uri in map) {
			if (uri.indexOf(prefix) == 0) {
				images.push(uri);
			}
		}
		return images;
	}

	this.getImage = function (src, noWarn) {
		// create the image
		var img = new Image();
		
		// find the base64 image if it exists
		if (Image.get) {
			var b64 = Image.get(src);
			if (b64 instanceof Image) { 
				return b64;
			}
		}
		
		if (b64) {
			img.src = b64;
			Image.set(src, img);
		} else {
			if (!noWarn) { logger.warn(src, 'may not be properly cached!'); }
			img.src = src;
		}

		return img;
	}

	/** 
	 * used internally by timestep.Image to seamlessly convert
	 * non-sprited image URLs to sprited images. This is here (rather
	 * than in timestep.Image) to keep sprite formats in one consistent place. 
	 */
	this._updateImageMap = function (map, url, x, y, w, h) {

		x = x || 0;
		y = y || 0;
		w = w == undefined ? -1 : w;
		h = h == undefined ? -1 : h;

		var info = this._map[url];
		if (!info || !info.sheet) {
			map.x = x;
			map.y = y;
			map.width = w;
			map.height = h;
			map.scale = 1;
			map.url = url;
			return;
		}

		var scale = info.scale || 1;

		// calculate the source rectangle, with margins added to the edges
		// (disregarding the fact that they may fall off the edge of the sheet)
		map.x = info.x - info.marginLeft;
		map.y = info.y - info.marginTop;
		map.width = info.w + info.marginLeft + info.marginRight;
		map.height = info.h + info.marginTop + info.marginBottom;
		
		// Add in any source map options passed in to get the actual offsets
		map.x += x * scale;
		map.y += y * scale;
		if (w > 0) {
			map.width = w * scale;
		}
		if (h > 0) {
			map.height = h * scale;
		}
		
		// now updatea the margins to account for the new source map
		map.marginLeft = Math.max(0, info.x - map.x);
		map.marginTop = Math.max(0, info.y - map.y);
		map.marginRight = Math.max(0, (map.x + map.width) - (info.x + info.w));
		map.marginBottom = Math.max(0, (map.y + map.height) - (info.y + info.h));
		
		// and re-offset the source map to exclude margins
		map.x += map.marginLeft;
		map.y += map.marginTop;
		map.width -= (map.marginLeft + map.marginRight);
		map.height -= (map.marginTop + map.marginBottom);
		
		// the scale of the source image, if scaled in a spritesheet
		map.scale = scale;
		map.url = info.sheet;

		return map;
	}

	this._getRaw = function (type, src, copy, noWarn) {
		// always return the cached copy unless specifically requested not to
		if (!copy && _cache[src]) { return _cache[src]; }
		var res = null;
		switch (type) {
			case 'audio':
				res = this.getSound(src);
				break;
			case 'image':
				res = this.getImage(src, noWarn);
				break;
			default:
				logger.error('unknown type for preloader', type);
		}
		return (_cache[src] = res);
	}

	// The callback is called for each image in the group with the image
	// source that loaded and whether there was an error.
	// 
	// function callback(lastSrc, error, isComplete, numCompleted, numTotal)
	//    where error is true or false and isComplete is true when numCompleted == numTotal
	//
	this._loadGroup = function (opts, cb) {
		var timeout = opts.timeout;
		var callback = new lib.Callback();
		
		// compute a list of images using file extensions
		var resources = opts.resources || [];
		var n = resources.length || 0;
		var loadableResources = [];
		for (var i = 0; i < n; ++i) {
			var ext = resources[i].substring(resources[i].lastIndexOf('.')).split('|')[0];
			if (MIME[ext] == 'image') {
				loadableResources.push({type:'image', resource: resources[i]});
				GLOBAL.NATIVE && NATIVE.gl && NATIVE.gl.touchTexture(resources[i]);
			} else if (MIME[ext] == 'audio') {
				loadableResources.push({type:'audio', resource: resources[i]});
			}
		}

		// If no resources were loadable,
		if (!loadableResources.length) {
			cb && callback.run(cb);
			callback.fire();
			return callback;
		}
		
		// do the preload asynchronously (note that base64 is synchronous, only downloads are asynchronous)
		var nextIndexToLoad = 0;
		var numResources = loadableResources.length;
		var parallel = Math.min(numResources, opts.parallel || 5); // how many should we try to download at a time?
		var numLoaded = 0;

		var loadResource = bind(this, function () {
		    var currentIndex = nextIndexToLoad++;
			var src = loadableResources[currentIndex];
			var res;
			if (src) {
				res = this._getRaw(src.type, src.resource, false, true);
			} else {
				// End of resource list, done!
				return;
			}

			var next = function (failed) {
				// If already complete, stub this out
				if (numLoaded >= numResources) { return; }

				// Set stubs for the reload and load events so that code
				// elsewhere can blindly call these without causing problems.
				// An alternative would be to set these to null but not every
				// piece of code that uses this does the right checks.
				res.onreload = res.onload = res.onerror = function() {};

				// The number of loads (success or failure) has increased.
				++numLoaded;

				// If we have loaded all of the resources,
				if (numLoaded >= numResources) {
					// Call the progress callback with isComplete == true
					cb && cb(src, failed, true, numLoaded, numResources);

					// If a timeout was set, clear it
					if (_timeout) {
						clearTimeout(_timeout);
					}

					// Fire the completion callback chain
					callback.fire();
				} else {
					// Call the progress callback with the current progress
					cb && cb(src, failed, false, numLoaded, numResources);

					// Restart on next image in list
					setTimeout(loadResource, 0);
				}
			};

			// IF this is the type of resource that has a reload method,
			if (res.reload && res.complete) {
				// Use the magic of closures to create a chain of onreload
				// completion callbacks.  This is really important because
				// we can be be preloading the same resource twice, and we can
				// also be simultaneously preloading two groups at once.
				var prevOnLoad = res.onreload;
				var prevOnError = res.onerror;

				// When the resource completes loading, either with success
				// or failure:

				res.onreload = function () {
					// If previous callback exists, run it first in a chain
					prevOnLoad && prevOnLoad();

					// React to successful load of this resource
					next(false);
				};

				res.onerror = function () {
					// If previous callback exists, run it first in a chain
					prevOnError && prevOnError();

					// React to failed load of this resource
					next(true);
				}

				// Start it reloading
				res.reload();
			} else if (res.complete) {
				// Since the resource has already completed loading, go
				// ahead and invoke the next callback indicating the previous
				// success or failure.
				next(res.failed === true);
			} else {
				// The comments above about onreload callback chaining equally
				// apply here.  See above.
				var prevOnLoad = res.onload;
				var prevOnError = res.onerror;

				// When the resource completes loading, either with success
				// or failure:

				res.onload = function () {
					// If previous callback exists, run it first in a chain
					prevOnLoad && prevOnLoad();

					// Reset fail flag
					res.failed = false;

					// React to successful load of this resource
					next(false);
				};

				res.onerror = function () {
					// If previous callback exists, run it first in a chain
					prevOnError && prevOnError();

					// Set fail flag
					res.failed = true;

					// React to failed load of this resource
					next(true);
				};
			}
		});

		var _timeout = null;
		setTimeout(function () {
			// spin up n simultaneous loaders!
			for (var i = 0; i < parallel; ++i) { loadResource(); }
			
			// register timeout call
			if (timeout) {
				_timeout = setTimeout(function () {
					callback.fire();
					numLoaded = numResources;
				}, timeout)
			}
		}, 0);
		
		return callback;
	}
});

exports = new Loader();
