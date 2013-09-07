var fs = require('fs');
var ff = require('ff');
var path = require('path');
var wrench = require('wrench');

var hashFile = require("../../../../src/hashFile");

/**
 * Packaging for Native.
 * Native on any platform requires a compiled JavaScript file, so we make this
 * generic and include it here.
 */

var _build;
var _logger;
var _paths;

var INITIAL_IMPORT = 'gc.native.launchClient';

var installAddons = function(builder, project, next) {
	var paths = builder.common.paths;
	var addons = project && project.manifest && project.manifest.addons;

	var f = ff(this, function() {
		// For each addon,
		if (addons) {
			for (var ii = 0; ii < addons.length; ++ii) {
				var addon = addons[ii];

				// Prefer paths in this order:
				var addon_js_ios = paths.addons(addon, 'js', 'ios');
				var addon_js_android = paths.addons(addon, 'js', 'android');
				var addon_js_native = paths.addons(addon, 'js', 'native');
				var addon_js = paths.addons(addon, 'js');

				if (fs.existsSync(addon_js_ios)) {
					logger.log("Installing addon:", addon, "-- Adding ./js/ios to jsio path");
					require(paths.root('src', 'AddonManager')).registerPath(addon_js_ios);
				} else if (fs.existsSync(addon_js_android)) {
					logger.log("Installing addon:", addon, "-- Adding ./js/android to jsio path");
					require(paths.root('src', 'AddonManager')).registerPath(addon_js_android);
				} else if (fs.existsSync(addon_js_native)) {
					logger.log("Installing addon:", addon, "-- Adding ./js/native to jsio path");
					require(paths.root('src', 'AddonManager')).registerPath(addon_js_native);
				} else if (fs.existsSync(addon_js)) {
					logger.log("Installing addon:", addon, "-- Adding ./js to jsio path");
					require(paths.root('src', 'AddonManager')).registerPath(addon_js);
				} else {
					logger.warn("Installing addon:", addon, "-- No js directory so no JavaScript will be installed");
				}
			}
		}
	}).error(function(err) {
		logger.error("Failure installing addon javascript:", err);
	}).cb(next);
}

// takes a project, subtarget(android/ios), additional opts.
exports.build = function (build, project, subtarget, moreOpts, next) {
	var target = 'native-' + subtarget;

	_build = build;
	_paths = _build.common.paths;
	logger = new build.common.Formatter('build-native');

	// Get domain from manifest under studio.domain
	var studio = project.manifest.studio;
	var domain = studio ? studio.domain : null;
	domain = domain || "gameclosure.com";

	//define a bunch of build options
	var opts = _build.packager.getBuildOptions({
		appID: project.manifest.appID,

		output: moreOpts.buildPath, // path is overriden by native if not the test app or simulate
		fullPath: project.paths.root, // path
		localBuildPath: path.relative(project.paths.root, moreOpts.buildPath),

		debug: moreOpts.debug,
		servicesURL: moreOpts.servicesURL,

		isSimulated: !!moreOpts.isSimulated,
		isTestApp: !!moreOpts.isTestApp,
		noRedirect: false,
		compress: moreOpts.compress,
		noPrompt: true,

		// Build process.
		packageName: '',
		studio: domain,
		version: project.manifest.version,
		metadata: null,

		template: moreOpts.template,

		target: target,
		subtarget: subtarget,
	});
	
	// doesn't build ios - builds the js that it would use, then you shim out NATIVE
	if (opts.isTestApp) {
		installAddons(build, project, function() {
			exports.writeNativeResources(project, opts, next);
		});
	} else if (opts.isSimulated) {
		// Build simulated version
		//
		// When simulating, we build a native version which targets the native target
		// but uses the browser HTML to host. A native shim is supplied to mimick native
		// features, so that the code can be tested in the browser without modification.
		require('../browser/browser').runBuild(_build, project, opts, next);
	} else {
		// Use native target (android/ios)
		require('./' + target).package(_build, project, opts, next);
	}
};

// Write out native javascript, generating a cache and config object.

var NATIVE_ENV_JS = fs.readFileSync(path.join(__dirname, "env.js"), 'utf8');

function wrapNativeJS (project, opts, target, resources, code) {
	var inlineCache = {};
	resources.forEach(function (info) {
		if (!fs.existsSync(info.fullPath)) {
			return;
		}
		
		var ext = path.extname(info.fullPath).substr(1);
		if (ext == "js") {
			var contents = fs.readFileSync(info.fullPath, 'utf-8');
			inlineCache[info.relative] = contents;
		} else if (ext == "json") {
			// TODO Minify JSON
			var jsonData = fs.readFileSync(info.fullPath, 'utf-8');
			try {
				inlineCache[info.relative] = JSON.stringify(JSON.parse(jsonData));
			} catch (e) {
				var exStr = 'Invalid JSON resource: ' + info.relative;
				logger.error(exStr);
				throw new Error(exStr);
			}
		}
	});
	
	return [
		_build.packager.getJSConfig(project, opts, target),
		"window.CACHE = " + JSON.stringify(inlineCache) + ";",
		code,
		NATIVE_ENV_JS
	].join('');
}

function filterCopyFile(ios, file) {
	var exemptFiles = ["spritesheets/map.json", "spritesheets/spritesheetSizeMap.json", "resources/fonts/fontsheetSizeMap.json"];

	if (!file.endsWith(".js") && (exemptFiles.indexOf(file) >= 0 || !file.endsWith(".json"))) {
		// If iOS,
		if (ios) {
			if (file.endsWith(".ogg")) {
				return "ignore";
			}
		} else { // Else on Android or other platform that supports .ogg:
			// If it is MP3,
			if (file.endsWith(".mp3") && fs.existsSync(file.substr(0, file.length - 4) + ".ogg")) {
				return "ignore";
			} else if (file.endsWith(".ogg")) {
				return "renameMP3";
			}
		}

		return null;
	}

	return "ignore";
}

// Write out build resources to disk.
//creates the js code which is the same on each native platform
exports.writeNativeResources = function (project, opts, next) {
	logger.log("Writing resources for " + opts.appID + " with target " + opts.target);

	var ios = opts.target.indexOf("ios") >= 0;

	opts.mapMutator = function(keys) {
		var deleteList = [], renameList = [];

		for (var key in keys) {
			switch (filterCopyFile(ios, key)) {
			case "ignore":
				deleteList.push(key);
				break;
			case "renameMP3":
				renameList.push(key);
				break;
			}
		}

		for (var ii = 0; ii < deleteList.length; ++ii) {
			var key = deleteList[ii];

			delete keys[key];
		}

		for (var ii = 0; ii < renameList.length; ++ii) {
			var key = renameList[ii];
			var mutatedKey = key.substr(0, key.length - 4) + ".mp3";
			
			keys[mutatedKey] = keys[key];
			keys[key] = undefined;
		}
	};

	var f = ff(function () {
		_build.packager.compileResources(project, opts, opts.target, INITIAL_IMPORT, f());
	}, function (pkg) {
		var files = pkg.files;

		/*
		icons = manifest.get("icons", {}).values()
		if len(icons) > 0:
		files.push('icon.png', open(icons[-1]).read())
		*/

		var cache = {};

		function embedFile (info) {
			switch (filterCopyFile(ios, info.relative)) {
			case "ignore":
				break;
			case "renameMP3":
				info.relative = info.relative.substr(0, info.relative.length - 4) + ".mp3";
				// fall-thru
			default:
				logger.log("Writing resource:", info.relative);
				cache[info.relative] = {
					src: info.fullPath
				};
				break;
			}
		}

		files.sprites.forEach(embedFile);
		files.resources.forEach(embedFile);

		cache["manifest.json"] = {
			contents: JSON.stringify(project.manifest)
		};

		// If native.js is > 1mb, it won't be read properly by android because it must
		// be uncompressed. To avoid this, we suffix it with .mp3, a filetype that the
		// Android system won't compress.
		cache["native.js.mp3"] = {
			contents: wrapNativeJS(project, opts, opts.target, files.resources, pkg.jsSrc)
		};

		logger.log('writing files to', opts.output);
		
		var list = {};

		var keys = Object.keys(cache);
		var i = 0;
		var onCopy = f.wait();

		function writeNext() {
			var key = keys[i++];

			if (!key) {
				onCopy();
				return;
			}

			list[key] = "-";

			var out = path.join(opts.output, key);
			wrench.mkdirSyncRecursive(path.dirname(out));

			var f2 = ff(function () {
					// Use generated data or read in file
					if (cache[key] == null) {
						logger.error("No file contents for", key);
					} else if (cache[key].contents) {
						fs.writeFile(out, cache[key].contents, f2());
					} else if (cache[key].src) {
						_build.common.child('cp', ['-p', cache[key].src, out], {cwd: opts.fullPath}, f2());
					}
				}, function () {
					// build a list of etags so the test app doesn't have to make a
					// lot of HTTP requests
					hashFile(path.resolve(opts.fullPath, out), f2());
				}, function (hash) {
					// don't really care about errors here since the hash is used
					// as a download optimization anyway
					if (hash) {
						list[key] = hash;
					}
				}).cb(writeNext);
		}

		f(list);
		writeNext();
	}, function (list) {
		logger.log("Writing file list to " + path.join(opts.output, 'resource_list.json'));
		fs.writeFile(path.join(opts.output, 'resource_list.json'), JSON.stringify(list), f());
	}).cb(function (err) {
		if (err) {
			logger.error(err);
			console.log(err.stack);
		} else {
			next();
		}
	});
}

