var path = require('path');
var fs = require('fs');
var wrench = require('wrench');
var util = require('util');
var request = require('request');
var crypto = require('crypto');
var spawn = require('child_process').spawn;
var clc = require('cli-color');
var read = require('read');
var ff = require('ff');
var common = require('../../../../src/common');

var logger;

/**
 * Arguments.
 */

var argv = require('optimist')
	.alias('clean', 'c').describe('clean', 'Clean build before compilation').boolean('clean').default('clean', false)
	.argv;

/**
 * Utilities
 */

function nextStep () {
	var func = arguments[arguments.length - 1];
	return func(null);
}

function transformXSL (inFile, outFile, xslFile, params, next) {
	for (var key in params) {
		if (typeof params[key] != 'string') {
			if (params[key] == undefined || typeof params[key] == 'object') {
				logger.error("settings for AndroidManifest: value for", clc.yellow.bright(key), "is not a string");
			}

			params[key] = JSON.stringify(params[key]);
		}
	}

	_builder.jvmtools.exec('xslt', [
		"--in", inFile,
		"--out", outFile,
		"--stylesheet", xslFile,
		"--params", JSON.stringify(params)
	], function (xslt) {
		var formatter = new _builder.common.Formatter('xslt');
		xslt.on('out', formatter.out);
		xslt.on('err', formatter.err);
		xslt.on('end', function (data) {
			var dat = fs.readFileSync(outFile).toString();
			dat = dat.replace(/android:label=\"[^\"]*\"/g, "android:label=\""+params.title+"\"");
			fs.writeFileSync(outFile, dat);

			next();
		})
	});
}

/**
 * Android Target
 */

var androidDir;
var keystore;
var storepass;
var keypass;
var key;

var PUNCTUATION_REGEX = /[!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~]/g;
var PUNCTUATION_OR_SPACE_REGEX = /[!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~ ]/g;

// Verify that submodules have been populated
function validateSubmodules(next) {
	var submodules = [
		"native-core/core.h",
		"barista/src/engine.js"
	];

	var f = ff(function() {
		var group = f.group();

		for (var i = 0; i < submodules.length; ++i) {
			fs.exists(path.join(androidDir, submodules[i]), group.slotPlain());
		}
	}, function(results) {
		var allGood = results.every(function(element, index) {
			if (!element) {
				logger.error("Submodule " + path.dirname(submodules[index]) + " not found");
			}
			return element;
		});

		if (!allGood) {
			f.fail("One of the submodules was not found.  Make sure you have run submodule update --init on your clone of the Android repo");
		}
	}).success(next).error(function(err) {
		logger.error("ERROR:", err);
		process.exit(1);
	});
}

function getTealeafAndroidPath (next) {
	var dir = common.config.get('android.root');
	if (dir && fs.existsSync(dir) && fs.existsSync(path.join(dir, "TeaLeaf"))) {
		return next(dir);
	}

	logger.error( '       Cannot locate android. Set the variable\n'
				+ '       android.root in basil/config.json that the path exists.\n'
				+ '       Currently set to: ' + dir + '\n\n');

	read({prompt: 'Manually enter the path to gc android (or hit return to abort): '}, function (err, dir) {
		if (dir && fs.existsSync(dir) && fs.existsSync(path.join(dir, "TeaLeaf"))) {
			return next(dir);
		}

		logger.error('Android root not found, aborting.');
		process.exit(2);
	});
}

// Clean and rebuild the TeaLeaf android support project.

function buildSupportProjects (project, destDir, debug, clean, next) {
	var androidDir, tealeafDir;
	
	var f = ff(this, function () {
		getTealeafAndroidPath(f.slotPlain());
	}, function (dir) {
		androidDir = dir;
		tealeafDir = path.join(androidDir, "TeaLeaf");
		if (clean) {
			_builder.common.child('make', ['clean'], {cwd: androidDir}, f.waitPlain()); //this is waitPlain because it can fail and not break.
		} else {
			f.waitPlain()();
		}
	}, function () {
		_builder.common.child('ndk-build', ["-j", "8", (debug ? "DEBUG=1" : "RELEASE=1")], { cwd: tealeafDir }, f.wait()); 
	}, function () {
		_builder.common.child('ant', [(debug ? "debug" : "release")], { cwd: tealeafDir }, f.wait());
	}).failure(function (e) {
		logger.error("Error: could not build support projects.");
		console.log(e);
		process.exit();
	}).success(next);
}

// Build our target project, once TeaLeaf is built.

function buildAndroidProject (destDir, debug, next) {
	_builder.common.child('ant', [(debug ? "debug" : "release")], {
		cwd: destDir
	}, function (err) {
		if (err) {
			return next(err);
		}

		_builder.common.child("node", [path.join(androidDir, "plugins/uninstallPlugins.js")], {}, next);
	});
}

// Create the android project.

function makeAndroidProject(project, namespace, activity, title, appID,
		shortName, version, debug,
		destDir, servicesURL, metadata, studioName, next)
{
	var target = "android-15";
	var f = ff(function () {
		_builder.common.child('android', [
			"create", "project", "--target", target, "--name", shortName,
			"--path", destDir, "--activity", activity,
			"--package", namespace
		], {}, f());
	}, function () {
		_builder.common.child('android', [
			"update", "project", "--target", target,
			"--path", destDir,
			"--library", "../../TeaLeaf"
		], {}, f());
	}, function () {
		fs.appendFile( path.join(destDir, 'project.properties'), 'out.dexed.absolute.dir=../.dex/\n',f());
	}, function () {
		updateManifest(project, namespace, activity, title, appID, shortName, version, debug, destDir, servicesURL, metadata, studioName, f.waitPlain());
		updateActivity(project, namespace, activity, destDir, f.waitPlain());
	}).error(function (code) {
		if (code != 0) {
			logger.error("build failed creating android project");
			logger.error(code);
			process.exit(2);
		} else {
			logger.error("an unknown error occurred");
			console.error(code);
		}
	}).success(next);
}

//void signAPK(String shortName, File destDir) throws Exception {
function signAPK (shortName, destDir, next) {
	logger.log('Signing APK.');

	logger.log(path.join(destDir, "bin"));
	_builder.common.child('jarsigner', [
		"-sigalg", "MD5withRSA", "-digestalg", "SHA1",
		"-keystore", keystore, "-storepass", storepass, "-keypass", keypass,
		"-signedjar", shortName + "-unaligned.apk",
		shortName + "-release-unsigned.apk",
		key
	], {
		cwd: path.join(destDir, "bin")
	}, function (err) {
		_builder.common.child('zipalign', [
			"-f", "-v", "4", shortName + "-unaligned.apk", shortName + "-aligned.apk"
		], {
			cwd: path.join(destDir, 'bin')
		}, function () {
			next();
		});
	});
}

function copyFonts (project, destDir) {
	var fontDir = path.join(destDir, 'assets/fonts');
	wrench.mkdirSyncRecursive(fontDir);

	var ttf = project.ttf;

	if (!ttf) {
		logger.error("WARNING: No \"ttf\" section found in the manifest.json, so no custom TTF fonts will be installed.  This does not affect bitmap fonts.");
	} else if (ttf.length <= 0) {
		logger.log("No \"ttf\" fonts specified in manifest.json, so no custom TTF fonts will be built in.  This does not affect bitmap fonts.");
	} else {
		for (var i = 0, ilen = ttf.length; i < ilen; ++i) {
			var filePath = ttf[i];

			_builder.common.copyFileSync(filePath, path.join(fontDir, path.basename(filePath)));
		}
	}
}

var DEFAULT_ICON_PATH = {
	"36": "drawable-ldpi/icon.png",
	"48": "drawable-mdpi/icon.png",
	"72": "drawable-hdpi/icon.png",
	"96": "drawable-xhdpi/icon.png"
};

//void copyIcon(File destDir, String tag, int size) throws Exception {
function copyIcon (project, destDir, tag, size) {
	var destPath = path.join(destDir, "res/drawable-" + tag + "dpi/icon.png");
	wrench.mkdirSyncRecursive(path.dirname(destPath));

	var android = project.manifest.android;
	var iconPath = android && android.icons && android.icons[size];

	if (iconPath && fs.existsSync(iconPath)) {
		_builder.common.copyFileSync(iconPath, destPath);
	} else {
		logger.error("WARNING: No icon specified in the manifest for '", size, "'.  Using the default icon for this size.  This is probably not what you want.");

		// Do not copy a default icon to this location -- Android will fill in
		// the blanks intelligently.
		//_builder.common.copyFileSync(path.join(androidDir, "TeaLeaf/res", DEFAULT_ICON_PATH[size]), destPath);
	}
}

var DEFAULT_NOTIFY_ICON_PATH = {
	"low": "drawable-ldpi/notifyicon.png",
	"med": "drawable-mdpi/notifyicon.png",
	"high": "drawable-hdpi/notifyicon.png",
	"xhigh": "drawable-xhdpi/notifyicon.png"
};

//void copyNotifyIcon(File destDir, String tag, String name) throws Exception {
function copyNotifyIcon (project, destDir, tag, name) {
	var destPath = path.join(destDir, "res/drawable-" + tag + "dpi/notifyicon.png");
	wrench.mkdirSyncRecursive(path.dirname(destPath));

	var android = project.manifest.android;
	var iconPath = android && android.icons && android.icons.alerts && android.icons.alerts[name];

	if (iconPath && fs.existsSync(iconPath)) {
		_builder.common.copyFileSync(iconPath, destPath);
	} else {
		//logger.error("WARNING: No alert icon specified in the manifest for '", name, "'.  Using the default icon for this size.  This is probably not what you want.");

		// Do not copy a default icon to this location -- Android will fill in
		// the blanks intelligently.
		//_builder.common.copyFileSync(path.join(androidDir, "TeaLeaf/res", DEFAULT_NOTIFY_ICON_PATH[name]), destPath);
	}
}

//void copyIcons(File destDir) throws Exception {
function copyIcons (project, destDir) {
	copyIcon(project, destDir, "l", "36");
	copyIcon(project, destDir, "m", "48");
	copyIcon(project, destDir, "h", "72");
	copyIcon(project, destDir, "xh", "96");
	copyNotifyIcon(project, destDir, "l", "low");
	copyNotifyIcon(project, destDir, "m", "med");
	copyNotifyIcon(project, destDir, "h", "high");
	copyNotifyIcon(project, destDir, "xh", "xhigh");
}

//void copySplash(File destDir) throws Exception {
function copySplash (project, destDir, next) {
	var destPath = path.join(destDir, "assets/resources");
	wrench.mkdirSyncRecursive(destPath);
	
	if (project.manifest.splash) {
		var potentialSplashFiles = ["universal", "portrait1136", "portrait960", "portrait480"];
		//try to find a potential splash
		for (var i in potentialSplashFiles) {
			if(project.manifest.splash[potentialSplashFiles[i]]) {
				var splashFile = path.resolve(project.manifest.splash[potentialSplashFiles[i]]);
				break;
			}
		}
		
		if (!splashFile) {
			logger.error("WARNING: Could not find a suitable splash field for generating splash images in the project manifest. Posible options are:" + JSON.stringify(potentialSplashFiles));
		}

		var splashes = [
			{ outFile: "splash-512x384.png", outSize: "512x384" },
			{ outFile: "splash-1024x768.png", outSize: "1024x768"},
			{ outFile: "splash-2048x1536.png", outSize: "2048x1536"}
		];

		var f = ff(function () {	
			var sLeft = splashes.length;
			var nextF = f();
			
			var makeSplash = function(i) {
				if (i < 0) {
					nextF();
					return;
				}
				var splash = splashes[i];
				var splashOut = path.join(destPath, splash.outFile);
				logger.log("Creating splash:  " + splashOut + " from: "  + splashFile);
				_builder.jvmtools.exec('splasher', [
					"-i", splashFile,
					"-o", splashOut,
					"-resize", splash.outSize,
					"-rotate", "auto"
				], function (splasher) {
					var formatter = new _builder.common.Formatter('splasher');
					splasher.on('out', formatter.out);
					splasher.on('err', formatter.err);
					splasher.on('end', function (data) {
						console.log("at end");
						makeSplash(i-1);
					})
				});
			}
			makeSplash(sLeft-1);
		}).cb(next);
	} else {
		logger.error("WARNING: No splash image provided in the provided manifest");
		next();
	}
}

//void copyMusic(File destDir) throws Exception {
function copyMusic (project, destDir) {
	if (project.manifest.splash) {
		var destPath = path.join(destDir, "res/raw");
		wrench.mkdirSyncRecursive(destPath);

		var musicPath = project.manifest.splash.song;
		if (musicPath && fs.existsSync(musicPath)) {
			_builder.common.copyFileSync(musicPath, path.join(destPath, "loadingsound.mp3"));
		} else {
			logger.error("WARNING: No splash music specified in the manifest.");
		}
	}
}

//if a res directory is provided by the project copy those files
//into the res directory of the android project
function copyResDir (project, destDir) {
	if (project.manifest.android &&
			project.manifest.android.resDir) {
		var destPath = path.join(destDir, "res");
		var sourcePath = path.resolve(
				project.manifest.android.resDir);
		wrench.copyDirSyncRecursive(sourcePath, destPath, {preserve: true});
	}
}

function getAndroidHash (next) {
	_builder.git.currentTag(androidDir, function (hash) {
		next(hash || 'unknown');
	});
}

function updateManifest (project, namespace, activity, title, appID, shortName, version, debug, destDir, servicesURL, metadata, studioName, next) {

	var defaults = {

		// Empty defaults
		installShortcut: "false",
		
		// Filled defaults
		entryPoint: "gc.native.launchClient",
		codeHost: "s.wee.cat",
		tcpHost: "s.wee.cat",
		codePort: "80",
		tcpPort: "4747",
		activePollTimeInSeconds: "10",
		passivePollTimeInSeconds: "20",
		syncPolling: "false",
		disableLogs: String(!debug), 
		develop: String(debug),
		servicesUrl: servicesURL,
		pushUrl: servicesURL + "push/%s/?key=%s&version=%s",
		contactsUrl: servicesURL + "users/me/contacts/?key=%s",
		userdataUrl: "",
		studioName: studioName,
	};
	
	var f = ff(function () {
		_builder.packager.getGameHash(project, f.slotPlain());
		_builder.packager.getSDKHash(f.slotPlain());
		getAndroidHash(f.slotPlain());
		versionCode(project, debug, f.slotPlain());
	}, function (gameHash, sdkHash, androidHash, versionCode) {

		var orientations = project.manifest.supportedOrientations;
		var orientation = "portrait";
		if (orientations.indexOf("portrait") != -1 && orientations.indexOf("landscape") != -1) {
			orientation = "unspecified";
		} else if (orientations.indexOf("landscape") != -1) { 
			orientation = "landscape";
		}

		function copy(target, src) {
			for (var key in src) {
				target[key] = src[key];
			}
		}

		function rename(target, oldKey, newKey) {
			if ('oldKey' in target) {
				target[newKey] = target[oldKey];
				delete target[newKey];
			}
		}

		function explode(target, key, mapping) {
			if (key in target) {
				for (var subKey in mapping) {
					if (target[key][subKey]) {
						target[mapping[subKey]] = target[key][subKey];
					}
				}

				delete target[key];
			}
		}

		var params = {};
			f(params);
			copy(params, defaults);
			copy(params, project.manifest.android);
			copy(params, {
					"package": namespace,
					title: title,
					activity: "." + activity,
					version: "" + version,
					appid: appID,
					shortname: shortName,
					orientation: orientation,
					studioName: studioName,
				gameHash: gameHash,
				sdkHash: sdkHash,
				androidHash: androidHash,
				versionCode: versionCode,
				debuggable: debug ? 'true' : 'false'
			});

		wrench.mkdirSyncRecursive(destDir);

		}, function(params) {
			f(params);
			fs.readFile(path.join(androidDir, "TeaLeaf/AndroidManifest.xml"), "utf-8", f());
		}, function(params, xmlContent) {
			f(params);
			fs.writeFile(path.join(destDir, "AndroidManifest.xml"), xmlContent, "utf-8", f.wait());
		}, function(params) {
			f(params);
			//read and copy AndroidManifest.xml to the destination 
			fs.readFile(path.join(androidDir, "TeaLeaf/AndroidManifest.xml"), "utf-8", f());
		}, function(params, xmlContent) {
			f(params);
			fs.writeFile(path.join(destDir, "AndroidManifest.xml"), xmlContent, "utf-8", f.wait());
		}, function(params) {
			f(params)
			//read in the plugins config
			fs.readFile(path.join(androidDir, "plugins", "config.json"), "utf-8", f());
		}, function(params, pluginsConfig) {
			f(params);
			pluginsConfig = JSON.parse(pluginsConfig);
			f(pluginsConfig);
			_builder.common.child("node", [path.join(androidDir, "plugins/injectPluginXML.js"), path.join(androidDir, "plugins"), path.join(destDir, "AndroidManifest.xml")], {}, f.wait());
		},  function(params, pluginsConfig) {
			f(params);
			//do xsl for all plugins first
			var  relativePluginPaths = [];
			f(relativePluginPaths);
			var group = f.group();
			for (var i in pluginsConfig) {
				var relativePluginPath = pluginsConfig[i];
				relativePluginPaths.push(relativePluginPath);
				var pluginConfigFile = path.join(androidDir, "plugins", relativePluginPath, "config.json");
				fs.readFile(pluginConfigFile, "utf-8", group());
			}
		}, function(params, paths, arr) {
			f(params);
			var hasPluginXsl = false;
			if (arr && arr.length > 0) {
				var pluginConfigArr = [];
				var group = f.group();
				for (var a in arr) {
					var pluginConfig = JSON.parse(arr[a]);
					//if no android plugin exists, continue...

					var xslPath = path.join(androidDir, "plugins", paths[a], pluginConfig.injectionXSL.name);
					if (!fs.existsSync(xslPath)) {
						continue;
					}

					hasPluginXsl = true;
					transformXSL(path.join(destDir, "AndroidManifest.xml"),
							path.join(destDir, ".AndroidManifest.xml"),
							xslPath,
							params,
							group()
							);
				}
			}
			f(hasPluginXsl);

		}, function(params, hasPluginXsl) {
			//and now the final xsl
			var xmlPath = hasPluginXsl ? path.join(destDir,".AndroidManifest.xml") : path.join(androidDir, "TeaLeaf/AndroidManifest.xml");
			transformXSL(xmlPath,
					path.join(destDir, "AndroidManifest.xml"),
					path.join(androidDir, "AndroidManifest.xsl"),
					params,
					f());
		}).error(function(code) {
			logger.error(code);
			logger.error("Build failed: error transforming XSL for AndroidManifest.xml");
			process.exit(2);
		}).success(function() {
			next();
		}
	);
}

function versionCode (proj, debug, next) {
	var versionPath = path.join(proj.paths.root, '.version');
	var version;

	var f = ff(this, function () {
		fs.exists(versionPath, f.slotPlain());
	}, function (exists) {
		//if !exists create it
		var onFinish = f.wait();
		if (!exists) {
			fs.writeFile(versionPath, '0', onFinish);
		} else {
			onFinish();
		}
	}, function () {
		//read the version
		fs.readFile(versionPath, f());
	}, function (readVersion) {
		version = parseInt(readVersion, 10);
		if (isNaN(version)) {
			logger.error(".version file seems incorrect. Make sure it's correctly formatted.");
			if (!debug) process.exit();
		}
		var onFinish = f.wait();

		if (!debug) {
			fs.writeFile(versionPath, version+=1, onFinish);
		} else {
			onFinish();
		}
	}, function () {
		next(version);
	}).error(function (err) {
		if (!debug) {
			logger.error("Could not get version code.", err);
			process.exit();
		} else {
			logger.error("Could not get version code. Continuing as this is a debug build.");
			next(0);
		}
	});
}

function updateActivity(project, namespace, activity, destDir, next) {
	var activityFile = path.join(destDir, "src/" + namespace.replace(/\./g, "/") + "/" + activity + ".java");
	if (fs.existsSync(activityFile)) {
		fs.readFile(activityFile, 'utf-8', function (err, contents) {
			contents = contents
				.replace(/extends Activity/g, "extends com.tealeaf.TeaLeaf")
				.replace(/setContentView\(R\.layout\.main\);/g, "startGame();");
			fs.writeFile(activityFile, contents, next);
		});
	}
}

/**
 * Module API
 */

var _builder;
exports.package = function (builder, project, opts, next) {
	// create some module-level variables; TODO: rewrite this as code + state (create an object to encapsulate state)
	_builder = builder;
	logger = new _builder.common.Formatter('android');

	// Command line options.
	debug = opts.debug;
	clean = argv.clean;
	// Extracted values from options.
	var packageName = opts.packageName;
	var studio = opts.studio;
	var metadata = opts.metadata;

	getTealeafAndroidPath(function (dir) {
		androidDir = dir;

		// TODO: Rewrite everything with ff (CSL)
		var f = ff(this, function() {
			validateSubmodules(f());
		}).error(function(err) {
			logger.error('ERROR:', err);
			process.exit(2);
		});

		// Load paths.
		keystore = common.config.get('android.keystore');
		storepass = common.config.get('android.storepass');
		keypass = common.config.get('android.keypass');
		key = common.config.get('android.key');
		if (!debug && (!keystore || !storepass || !keypass || !key)) {
			logger.error('Missing keystore, storepass, keypass, or key in config.json.');
			throw new Error('Missing android parameters in configuration file.');
		}

		// Extract manifest properties.
		var appID = project.manifest.appID;
		var shortName = project.manifest.shortName;
		// Verify they exist.
		if (appID === null || shortName === null) {
			throw new Error("Build aborted: No appID or shortName in the manifest.");
		}

		appID = appID.replace(PUNCTUATION_REGEX, ""); // Strip punctuation.
		// Destination directory is the android build directory.
		var destDir = path.join(androidDir, "build/" + shortName);

		// Remove existing build directory.
		wrench.rmdirSyncRecursive(destDir, true);

		// Project title.
		var title = project.manifest.title;
		if (title === null) {
			title = shortName;
		}
		// Create Android Activity name.
		var activity = shortName + "Activity";
		// Studio qualified name.
		if (studio === null) {
			studio = "wee.cat";
		}
		var names = studio.split(/\./g).reverse();
		studio = names.join('.');
		
		var studioName = project.manifest.studio && project.manifest.studio.name;
		
		var servicesURL = opts.servicesURL;

		if (packageName === null || packageName.length === 0) {
			packageName = studio + "." + shortName;
		}
		
		// Build the project archive. Save the APK dir now, since we're going to redirect
		// all output to the native build directory
		var apkDir = opts.output;
		opts.output = path.join(destDir, "assets/resources");

		// Parallelize android project setup and sprite building.
		var f = ff(function () {
			_builder.common.child("node", [path.join(androidDir, "plugins/installPlugins.js")], {}, f.wait());
			require('./native').writeNativeResources(project, opts, f.waitPlain());
			
			makeAndroidProject(project, packageName, activity, title, appID,
					shortName, opts.version, debug, destDir, servicesURL, metadata,
					studioName, f.waitPlain());
			
			var cleanProj = (common.config.get("lastBuildWasDebug") != debug) || clean;
			common.config.set("lastBuildWasDebug", debug);
			buildSupportProjects(project, destDir, debug, cleanProj, f.waitPlain());

		}, function () {
			copyFonts(project, destDir);
			copyIcons(project, destDir);
			copyMusic(project, destDir);
			copyResDir(project, destDir);

			copySplash(project, destDir, f());
		}, function () {
			buildAndroidProject(destDir, debug, function (success) {
				//if (!success) {
				//  logger.error("BUILD FAILED");
				//  return null;
				//}
				
				var apk = "";
				if (!debug) {
					apk = shortName + "-aligned.apk";
				} else {
					apk = shortName + "-debug.apk";
				}

				(!debug ? signAPK : nextStep)(shortName, destDir, function () {
					var apkPath = path.join(apkDir, shortName + ".apk");
					if (fs.existsSync(apkPath)) {
						fs.unlinkSync(apkPath);
					}

					var destApkPath = path.join(destDir, "bin/" + apk);
					if (fs.existsSync(destApkPath)) {
						wrench.mkdirSyncRecursive(path.dirname(apkPath), 0777);
						_builder.common.copyFileSync(destApkPath, apkPath);
						logger.log("built", clc.yellow.bright(packageName));
						logger.log("saved to " + clc.blue.bright(apkPath));
						next(0);
					} else {
						logger.error(clc.red.bright("NO FILE AT " + destApkPath));
						next(2);
					}
					
				});
			});
		}).error(function (err) {
			console.error("unexpected error:");
			console.error(err);
		})
	});
};
