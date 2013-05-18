var wrench = require('wrench');
var async = require('async');
var path = require('path');
var fs = require('fs');
var clc = require('cli-color');
var read = require('read');
var ff = require('ff');

var common = require('../../../../src/common');

var logger;
var xcode = require('./ios/xcode.js');

var iOSPath;

// helper function
function copyFileSync (from, to) {
	return fs.writeFileSync(to, fs.readFileSync(from));
}

/**
 * iOS target
 */

var PUNCTUATION_REGEX = /[!"#$%&'()*+,\-.\/:;<=>?@\[\\\]^_`{|}~]/g;

// Verify that submodules have been populated
function validateSubmodules(next) {
	var submodules = [
		"tealeaf/core/core.h"
	];

	var f = ff(function() {
		var group = f.group();

		for (var i = 0; i < submodules.length; ++i) {
			fs.exists(path.join(iOSPath, submodules[i]), group.slotPlain());
		}
	}, function(results) {
		var allGood = results.every(function(element, index) {
			if (!element) {
				logger.error("ERROR: Submodule " + path.dirname(submodules[index]) + " not found");
			}
			return element;
		});

		if (!allGood) {
			f.fail("One of the submodules was not found.  Make sure you have run submodule update --init on your clone of the iOS repo");
		}
	}).cb(next);
}

function writeConfigList(opts, next) {
	var config = [];

	config.push('<?xml version="1.0" encoding="UTF-8"?>');
	config.push('<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">');
	config.push('<plist version="1.0">');
	config.push('<dict>');
	config.push('\t<key>remote_loading</key>');
	config.push('\t<' + opts.remote_loading + '/>');
	config.push('\t<key>tcp_port</key>');
	config.push('\t<integer>' + opts.tcp_port + '</integer>');
	config.push('\t<key>code_port</key>');
	config.push('\t<integer>' + opts.code_port + '</integer>');
	config.push('\t<key>screen_width</key>');
	config.push('\t<integer>' + opts.screen_width + '</integer>');
	config.push('\t<key>screen_height</key>');
	config.push('\t<integer>' + opts.screen_height + '</integer>');
	config.push('\t<key>code_host</key>');
	config.push('\t<string>' + opts.code_host + '</string>');
	config.push('\t<key>entry_point</key>');
	config.push('\t<string>' + opts.entry_point + '</string>');
	config.push('\t<key>app_id</key>');
	config.push('\t<string>' + opts.app_id + '</string>');
	config.push('\t<key>tapjoy_id</key>');
	config.push('\t<string>' + opts.tapjoy_id + '</string>');
	config.push('\t<key>tapjoy_key</key>');
	config.push('\t<string>' + opts.tapjoy_key + '</string>');
	config.push('\t<key>tcp_host</key>');
	config.push('\t<string>' + opts.tcp_host + '</string>');
	config.push('\t<key>source_dir</key>');
	config.push('\t<string>' + opts.source_dir + '</string>');
	config.push('\t<key>code_path</key>');
	config.push('\t<string>' + opts.code_path + '</string>');
	config.push('\t<key>game_hash</key>');
	config.push('\t<string>' + opts.game_hash + '</string>');
	config.push('\t<key>sdk_hash</key>');
	config.push('\t<string>' + opts.sdk_hash + '</string>');
	config.push('\t<key>native_hash</key>');
	config.push('\t<string>' + opts.native_hash + '</string>');
	config.push('\t<key>apple_id</key>');
	config.push('\t<string>' + opts.apple_id + '</string>');
	config.push('\t<key>bundle_id</key>');
	config.push('\t<string>' + opts.bundle_id + '</string>');
	config.push('\t<key>version</key>');
	config.push('\t<string>' + opts.version + '</string>');
	config.push('\t<key>userdata_url</key>');
	config.push('\t<string>' + opts.userdata_url + '</string>');
	config.push('\t<key>services_url</key>');
	config.push('\t<string>' + opts.services_url + '</string>');
	config.push('\t<key>push_url</key>');
	config.push('\t<string>' + opts.push_url + '</string>');
	config.push('\t<key>contacts_url</key>');
	config.push('\t<string>' + opts.contacts_url + '</string>');
	config.push('\t<key>studio_name</key>');
	config.push('\t<string>' + opts.studio_name + '</string>');
	config.push('</dict>');
	config.push('</plist>');

	var fileData = config.join('\n');

	fs.writeFile(opts.filePath, fileData, function(err) {
		next(err);
	});
}

var LANDSCAPE_ORIENTATIONS = /(UIInterfaceOrientationLandscapeRight)|(UIInterfaceOrientationLandscapeLeft)/;
var PORTRAIT_ORIENTATIONS = /(UIInterfaceOrientationPortraitUpsideDown)|(UIInterfaceOrientationPortrait)/;

// Updates the given TeaLeafIOS-Info.plist file to include fonts
function updatePListFile(opts, next) {
	var f = ff(this, function() {
		var configPath = path.join(iOSPath, 'plugins/config.json');
		fs.readFile(configPath, 'utf8', f());
	}, function(pluginsConfig) {
			//loop through plugins
			var group = f.group();
			pluginsConfig = JSON.parse(pluginsConfig);
			var pluginFiles = [];
			for (var i in pluginsConfig) {
				var relativePluginPath = pluginsConfig[i];
				var pluginDir = path.join(iOSPath, "plugins", relativePluginPath);
				var pluginConfigFile = path.join(pluginDir, "config.json");
				pluginFiles.push(pluginDir);
				//read all plugin configs, pass on 
				fs.readFile(pluginConfigFile , 'utf8', group());
			}
			f(pluginFiles);
	}, function(pluginConfigs, pluginDirs) {
		var pluginPlistInfos = []; 
		for (var i in pluginConfigs) {
			pluginConfigs[i] = JSON.parse(pluginConfigs[i]);
			var plistInfo = pluginConfigs[i].plist ;
			for (var p in plistInfo) {
				pluginPlistInfos.push(plistInfo[p]);
			}
		}
		
		fs.readFile(opts.plistFilePath, 'utf8', function(err, data) {
			logger.log("Updating Info.plist file: ", opts.plistFilePath);

			var contents = data.split('\n');

			// For each line,
			contents = contents.map(function(line) {
				// If it has an orientation to remove,
				if (line.match(LANDSCAPE_ORIENTATIONS) && opts.orientations.indexOf("landscape") == -1) {
					line = "";
				} else if (line.match(PORTRAIT_ORIENTATIONS) && opts.orientations.indexOf("portrait") == -1) {
					line = "";
				} else if (line.indexOf("13375566") >= 0) {
					line = line.replace("13375566", opts.version);
				} else {
					//loop through plugin plist information and use
					//it to replace fields
					for (var i in pluginPlistInfos) {
						var info = pluginPlistInfos[i];
						if (line.match(new RegExp(info.scheme, ""))) {
							line = line.replace(info.from, opts[info.to] || info.from);
							break;
						}
					}
				}
				return line;
			});

			if (!opts.fonts || !opts.fonts.length) {
				logger.log("Fonts: Skipping PList update step because no fonts are to be installed");
			} else {
				// For each line,
				for (var i = 0; i < contents.length; ++i) {
					var line = contents[i];

					if (line.indexOf("UIAppFonts") >= 0) {
						logger.log("Updating UIAppFonts section: Injecting section members for " + opts.fonts.length + " font(s)");

						var insertIndex = i + 2;

						// If empty array exists currently,
						if (contents[i + 1].indexOf("<array/>") >= 0) {
							// Eliminate empty array and insert <array> tags
							contents[i + 1] = "\t\t<array>"; // TODO: Guessing at indentation here
							contents.splice(i + 2, 0, "\t\t</array>");
						} else if (contents[i + 1].indexOf("<array>") >= 0) {
							// No changes needed!
						} else {
							logger.log("WARNING: Unable to find <array> tag right after UIAppFonts section, so failing!");
							break;
						}

						for (var j = 0, jlen = opts.fonts.length; j < jlen; ++j) {
							contents.splice(insertIndex++, 0, "\t\t\t<string>" + path.basename(opts.fonts[j]) + "</string>");
						}

						// Done searching
						break;
					}
				}
			}

			for (var i = 0; i < contents.length; ++i) {
				var line = contents[i];

				if (line.indexOf("UIPrerenderedIcon") >= 0) {
					logger.log("Updating UIPrerenderedIcon section: Set to", (opts.renderGloss ? "true" : "false"));

					// NOTE: By default, necessarily, UIPrerenderedIcon=true
					if (opts.renderGloss) {
						// Pull out this and next line
						contents[i] = "";
						contents[i+1] = "";
					}
				}
			}

			//Change Bundle Diplay Name to title
			for (var i = 0; i < contents.length; i++) {
				if (/CFBundleDisplayName/.test(contents[i])) {
					var titleLine = contents[i+1];
					contents[i+1] = '<string>' + opts.title + '</string>';
					break;
				}
			}

			contents = contents.join('\n');

			fs.writeFile(opts.plistFilePath, contents, function(err) {
				next(err);
			});
		});
	});
	
}

// Create the iOS project
var DEFAULT_IOS_PRODUCT = 'TeaLeafIOS';
var NAMES_TO_REPLACE = /(PRODUCT_NAME)|(name = )|(productName = )/;

function updateIOSProjectFile(opts, next) {
	fs.readFile(opts.projectFile, 'utf8', function(err, data) {
		if (err) {
			next(err);
		} else {
			logger.log("Updating iOS project file: ", opts.projectFile);

			var contents = data.split('\n');
			var i = 0, j = 0; // counters

			// For each line,
			contents = contents.map(function(line) {
				// If it has 'PRODUCT_NAME' in it, replace the name
				if (line.match(NAMES_TO_REPLACE)) {
					line = line.replace(DEFAULT_IOS_PRODUCT, opts.bundleID);
				}
				return line;
			});

			if (!opts.ttf) {
				logger.log("WARNING: No \"ttf\" section found in the manifest.json, so no custom TTF fonts will be installed.  This does not affect bitmap fonts.");
			} else if (opts.ttf.length <= 0) {
				logger.log("No \"ttf\" fonts specified in manifest.json, so no custom TTF fonts will be built in.  This does not affect bitmap fonts.");
			} else {
				var fonts = [];

				// For each font,
				for (i = 0, len = opts.ttf.length; i < len; ++i) {
					var uuid1 = "BAADBEEF";
					uuid1 += String('00000000' + i.toString(16).toUpperCase()).slice(-8);
					uuid1 += "DEADD00D";

					var uuid2 = "DEADD00D";
					uuid2 += String('00000000' + i.toString(16).toUpperCase()).slice(-8);
					uuid2 += "BAADF00D";

					fonts.push({
						path: opts.ttf[i],
						basename: path.basename(opts.ttf[i]),
						buildUUID: uuid1,
						refUUID: uuid2
					});
				}

				// For each line,
				var updateCount = 0;
				var inResourcesBuildPhase = false, inResourcesList = false, filesCount = 0;
				for (i = 0; i < contents.length; ++i) {
					var line = contents[i];

					if (line === "/* Begin PBXBuildFile section */") {
						logger.log("Updating project file: Injecting PBXBuildFile section members for " + fonts.length + " font(s)");

						for (j = 0, jlen = fonts.length; j < jlen; ++j) {
							contents.splice(++i, 0, "\t\t" + fonts[j].buildUUID + " /* " + fonts[j].basename + " in Resources */ = {isa = PBXBuildFile; fileRef = " + fonts[j].refUUID + " /* " + fonts[j].basename + " */; };");
						}

						++updateCount;
					} else if (line === "/* Begin PBXFileReference section */") {
						logger.log("Updating project file: Injecting PBXFileReference section members for " + fonts.length + " font(s)");

						for (j = 0, jlen = fonts.length; j < jlen; ++j) {
							contents.splice(++i, 0, "\t\t" + fonts[j].refUUID + " /* " + fonts[j].basename + " */ = {isa = PBXFileReference; lastKnownFileType = file; name = \"" + fonts[j].basename + "\"; path = \"fonts/" + fonts[j].basename + "\"; sourceTree = \"<group>\"; };");
						}

						++updateCount;
					} else if (line === "/* Begin PBXResourcesBuildPhase section */") {
						logger.log("Updating project file: Found PBXResourcesBuildPhase section");
						inResourcesBuildPhase = true;
						filesCount = 0;
					} else if (inResourcesBuildPhase && line.indexOf("files = (") >= 0) {
						if (++filesCount == 1) {
							logger.log("Updating project file: Injecting PBXResourcesBuildPhase section members for " + fonts.length + " font(s)");

							for (j = 0, jlen = fonts.length; j < jlen; ++j) {
								contents.splice(++i, 0, "\t\t\t\t" + fonts[j].buildUUID + " /* " + fonts[j].basename + " */,");
							}

							inResourcesBuildPhase = false;

							++updateCount;
						}
					} else if (line.indexOf("/* resources */ = {") >= 0) {
						logger.log("Updating project file: Found resources list section");
						inResourcesList = true;
					} else if (inResourcesList && line.indexOf("children = (") >= 0) {
						logger.log("Updating project file: Injecting resources children members for " + fonts.length + " font(s)");

						for (j = 0, jlen = fonts.length; j < jlen; ++j) {
							contents.splice(++i, 0, "\t\t\t\t" + fonts[j].refUUID + " /* " + fonts[j].basename + " */,");
						}

						inResourcesList = false;

						++updateCount;
					}
				}

				if (updateCount === 4) {
					logger.log("Updating project file: Success!");
				} else {
					logger.error("WARNING: Updating project file: Unable to find one of the sections to patch.  native-ios.js has a bug -- it may not work with your version of XCode yet!");
				}
			}

			contents = contents.join('\n');

			fs.writeFile(opts.projectFile, contents, 'utf8', function(err) {
				next(err);
			});
		}
	});
}


function copyFonts(ttf, destDir) {
	if (ttf) {
		var fontDir = path.join(destDir, 'tealeaf/resources/fonts');
		wrench.mkdirSyncRecursive(fontDir);

		for (var i = 0, ilen = ttf.length; i < ilen; ++i) {
			var filePath = ttf[i];

			copyFileSync(filePath, path.join(fontDir, path.basename(filePath)));
		}
	}
}

function copyIcons(icons, destPath) {
	if (icons) {
		['57', '72', '114', '144'].forEach(function(size) {
			var iconPath = icons[size];
			if (iconPath) {
				if (fs.existsSync(iconPath)) {
					var targetPath = path.join(destPath, 'tealeaf', 'icon' + size + '.png');
					logger.log("Icons: Copying ", path.resolve(iconPath), " to ", path.resolve(targetPath));
					copyFileSync(iconPath, targetPath);
				} else {
					logger.error('WARNING: Icon', iconPath, 'does not exist.');
				}
			} else {
				logger.error('WARNING: Icon size', size, 'is not specified under manifest.json:ios:icons.');
			}
		});
	} else {
		logger.error('WARNING: No icons specified under "ios".');
	}
}

var _copyFile = function(srcPath, destPath) {
	wrench.mkdirSyncRecursive(path.dirname(destPath));
	if (srcPath) {
		copyFileSync(srcPath, destPath);
	}
};

function copySplash(manifest, destPath, next) {
	if (manifest.splash) {
		var universalSplash = manifest.splash["universal"];
		
		var splashes = [
			{ key: "portrait480", outFile: "Default.png", outSize: "320x480" },
			{ key: "portrait960", outFile: "Default@2x.png", outSize: "640x960"},
			{ key: "portrait1024", outFile: "Default-Portrait~ipad.png", outSize: "768x1024"},
			{ key: "portrait1136", outFile: "Default-568h@2x.png", outSize: "640x1136"},
			{ key: "portrait2048", outFile: "Default-Portrait@2x~ipad.png", outSize: "1536x2048"},
			{ key: "landscape768", outFile: "Default-Landscape~ipad.png", outSize: "1024x768"},
			{ key: "landscape1536", outFile: "Default-Landscape@2x~ipad.png", outSize: "2048x1536"}
		];

		var f = ff(function () {
			var sLeft = splashes.length;
			var fNext = f();
			function makeSplash(i) {
				if (i < 0) {
					fNext();
					return;
				}
				
				var splash = splashes[i];
				if (manifest.splash[splash.key]) {
					var splashFile = path.resolve(manifest.splash[splash.key]);
				} else if(universalSplash) {
					var splashFile = path.resolve(universalSplash);
				} else {
					logger.error("WARNING: No universal splash given and no splash provided for " + splash.key);
					makeSplash(i-1);
					return;
				}
				
				var splashOut = path.join(path.resolve(destPath), 'tealeaf',splash.outFile);
				logger.log("Creating splash: " + splashOut + " from: "  + splashFile);
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
						makeSplash(i-1);
					})
				});
			}
			makeSplash(splashes.length - 1);
		}, function() {
			next();	
		});
	} else {
		logger.error("WARNING: No splash section provided in the provided manifest");
		next();
	}
}

function copyDir(srcPath, destPath, name) {
	wrench.copyDirSyncRecursive(path.join(srcPath, name), path.join(destPath, name));
	logger.log('copied', name, 'to', destPath);
}

function copyIOSProjectDir(srcPath, destPath, next) {
	logger.log('copying', srcPath, 'to', destPath);
	var parent = path.dirname(destPath);
	if (!fs.existsSync(parent)) {
		fs.mkdirSync(parent);
	}
	if (!fs.existsSync(destPath)) {
		fs.mkdirSync(destPath);
	}
	copyDir(srcPath, destPath, 'tealeaf');

	var f = ff(this, function () {
		var addons = project.manifest.addons;
		if (addons) {
			for (var ii = 0; ii < addons.length; ++ii) {
				var addon_path = path.join("../../", addons[ii], "/ios");
			}
		}
	}, function() {
		next();
	});
}

function getIOSHash(git, next) {
	git.currentTag(iOSPath, function (hash) {
		next(hash || 'unknown');
	});
}

function validateIOSManifest(manifest) {
	if (!manifest.ios) {
		// NOTE: This is actually a WARNING since no keys are required for now.
		//return "ios section is missing";
		manifest.ios = {};
	}

	var schema = {
		"entryPoint": {
			res: "Should be set to the entry point.",
			def: "gc.native.launchClient",
			halt: false,
			silent: true
		},
		"bundleID": {
			res: "Should be set to the Bundle ID (a name) for your app from iTunes Connect. In-app purchases may not work!",
			def: manifest.shortName,
			halt: false
		},
		"appleID": {
			res: "Should be set to the Apple ID (a number) for your app from iTunes Connect. In-app purchases may not work!",
			def: "123456789",
			halt: false
		},
		"version": {
			res: "Should be set to the Current Version string (ie. 1.0.0) for your app from iTunes Connect. In-app purchases may not work!",
			def: "1.0.0",
			halt: false
		}
	};

	function checkSchema(loadingParent, schemaParent, desc) {
		// For each key at this level of the schema tree,
		for (var key in schemaParent) {
			// Grab the subkey
			var loadPath = loadingParent[key];
			var schemaData = schemaParent[key];
			var loadType = typeof loadPath;

			if (loadType !== "string") {
				// Load and schema do not agree: Report to user
				var msg = 'The manifest.json key ' + desc + ':' + key + ' is missing! ' + schemaData.res;
				if (schemaData.halt) {
					return msg;
				} else {
					if (!schemaData.silent) {
						logger.log("USER WARNING: " + msg + " Defaulting to '" + schemaData.def + "'");
					}
					loadingParent[key] = schemaData.def;
				}
			}
		}

		return false;
	}

	return checkSchema(manifest.ios, schema, "ios");
}

function makeIOSProject(opts, next) {
	// Unpack options
	var debug = opts.debug;
	var servicesURL = opts.servicesURL;
	var manifest = opts.project.manifest;

	// Validate iOS section of the manifest.json file
	var validationError = validateIOSManifest(manifest);
	if (validationError) {
		logger.log("USER ERROR: manifest.json file ios section is malformed. " + validationError);
		process.exit(2);
	}

	var projectFile = path.join(opts.destPath, 'tealeaf/TeaLeafIOS.xcodeproj/project.pbxproj');

	var gameHash, sdkHash, nativeHash;

	var f = ff(this, function(){
		opts.builder.packager.getGameHash(opts.project, f.slotPlain());
		opts.builder.packager.getSDKHash(f.slotPlain());
		getIOSHash(opts.builder.git, f.slotPlain());
	}, function(game_hash, sdk_hash, native_hash) {
		gameHash = game_hash;
		sdkHash = sdk_hash;
		nativeHash = native_hash;

		copyIOSProjectDir(iOSPath, opts.destPath, f.wait());
	}, function() {
		updateIOSProjectFile({
			projectFile: projectFile,
			ttf: manifest.ttf,
			bundleID: manifest.ios.bundleID
		}, f.wait());

		var plistFile = path.join(opts.destPath, 'tealeaf/TeaLeafIOS-Info.plist');
		updatePListFile({
			plistFilePath: plistFile,
			fonts: manifest.ttf,
			orientations: manifest.supportedOrientations,
			renderGloss: manifest.ios.icons && manifest.ios.icons.renderGloss,
			version: manifest.ios.version,
			title: opts.title
		}, f.wait());

		writeConfigList({
			filePath: path.join(opts.destPath, "tealeaf/resources/config.plist"),

			remote_loading: 'false',
			tcp_port: 4747,
			code_port: 9201,
			screen_width: 480,
			screen_height: 800,
			code_host: 'localhost',
			entry_point: 'gc.native.launchClient',
			app_id: manifest.appID,
			tapjoy_id: manifest.ios.tapjoyId,
			tapjoy_key: manifest.ios.tapjoyKey,
			tcp_host: 'localhost',
			source_dir: '/',
			game_hash: gameHash,
			sdk_hash: sdkHash,
			native_hash: nativeHash,
			code_path: 'native.js.mp3',

			apple_id: manifest.ios.appleID,
			bundle_id: manifest.ios.bundleID,
			version: manifest.ios.version,

			services_url: servicesURL,
			push_url: servicesURL + "/push/%s/?key=%s&amp;version=%s",
			contacts_url: servicesURL + "/users/me/contacts/?key=%s",
			userdata_url: "",
			studio_name: manifest.studio && manifest.studio.name
		}, f.wait());
	}).error(function(code) {
		logger.log("Error while making iOS project file changes: " + code);
		process.exit(2);
	}).cb(next);
}

function finishCopy(project, destPath, cb) {
	copyIcons(project.ios.icons, destPath);
	copyFonts(project.ttf, destPath);
	var f = ff(function () {
		copySplash(project, destPath, f.wait());
	}, function () {
		logger.log('copy complete!');
		cb();
	});
}

function getTealeafIOSPath(next) {
	var dir = common.config.get('ios.root');
	if (dir && fs.existsSync(dir) && fs.existsSync(path.join(dir, "tealeaf"))) {
		return next(dir);
	}

	logger.error( '       Cannot locate tealeaf-ios. Set the variable\n'
				+ '       ios.root in basil/config.json that the path exists.\n'
				+ '       Currently set to: ' + dir + '\n\n');

	read({prompt: 'Manually enter the path to tealeaf-ios (or hit return to abort): '}, function (err, dir) {
		if (dir && fs.existsSync(dir) && fs.existsSync(path.join(dir, "tealeaf"))) {
			return next(dir);
		}

		logger.error('iOS root not found, aborting.');
		process.exit(2);
	})
}


/**
 * Module interface.
 */
var _builder;
exports.package = function (builder, project, opts, next) {
	_builder = builder;
	logger = new builder.common.Formatter("build-ios");

	/**
	 * Arguments.
	 */

	var argParser = require('optimist')
		.alias('help', 'h').describe('help', 'Display this help menu')
		.alias('debug', 'd').describe('debug', 'Create debug build').boolean('debug').default('debug', opts.template !== "release")
		.alias('clean', 'c').describe('clean', 'Clean build before compilation').boolean('clean').default('clean', opts.template !== "debug")
		.alias('ipa', 'i').describe('ipa', 'Generate appName.ipa file as output for TestFlight').boolean('ipa').default('ipa', false)
		.alias('provision', 'p').describe('provision', '(required for --ipa) Path to .mobileprovision profile file').string('provision')
		.alias('name', 'n').describe('name', '(required for --ipa) Name of developer').string('name')
		.alias('open', 'o').describe('open', '(ignored when --ipa is specified) Open the XCode project after building').boolean('open').default('open', true);
	var argv = argParser.argv;

	// If --help is being requested,
	if (argv.help) {
		argParser.showHelp();
		return;
	}

	// Merge command-line arguments into build options
	opts.argv = argv;

	common.track("BasilBuildNativeIOS", {"clean":clean, "debug":debug, "compress":opts.compress});

	getTealeafIOSPath(function(dir) {
		require(path.join(dir, "index")).build(common, builder, project, opts, next);
	});
};

