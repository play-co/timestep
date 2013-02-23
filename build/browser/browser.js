var path = require('path');
var fs = require('fs');
var ff = require('ff');
var wrench = require('wrench');
var util = require('util');
var mime = require('mime');

var INITIAL_IMPORT = 'gc.browser.launchClient';

// Static resources.
var STATIC_GA_JS = fs.readFileSync(path.join(__dirname, 'browser-static/ga.js'), 'utf8');
var STATIC_BOOTSTRAP_CSS = path.join(__dirname, 'browser-static/bootstrap.css');
var STATIC_BOOTSTRAP_JS = path.join(__dirname, 'browser-static/bootstrap.js');

var _builder;
var _paths;
var logger;
exports.build = function (builder, project, subtarget, moreOpts, next) {
	var target = 'browser-' + subtarget;
	var opts = builder.packager.getBuildOptions({
		appID: project.manifest.appID,
		version: Date.now(),

		fullPath: project.paths.root,
		localBuildPath: path.relative(project.paths.root, moreOpts.buildPath), 
		output: moreOpts.buildPath,

		debug: !!moreOpts.debug,
		stage: !!moreOpts.stage,

		isSimulated: moreOpts.isSimulated,
		ip: moreOpts.ip,

		servicesURL: moreOpts.servicesURL || '',

		target: target,
		subtarget: subtarget,

		compress: moreOpts.compress
	});

	exports.runBuild(builder, project, opts, next);
};

exports.runBuild = function (builder, project, opts, next) {
	_builder = builder;
	logger = new _builder.common.Formatter('build-browser');

	var f = ff(function () {
		_builder.packager.compileResources(project, opts, opts.target, INITIAL_IMPORT, f());
	}, function (pkg) {
		compileHTML(project, opts, opts.target, pkg.files, pkg.jsSrc, f());
	}, function (resources) {
		// Resources built, write out.
		logger.log('Writing resources...');
		exports.writeResources(opts, resources, f());
	}, function () {
		logger.log('Archive built.');
		next();
	});
};

exports.compileResources = function (project, opts, target, cb) {
	_builder.packager.compileResources
}

/**
 * Utilities
 */
 
function toDataURI (data, mime) {
	return "data:" + mime + ";base64," + new Buffer(data).toString('base64');
}

/**
 * Font embedding.
 */

// Convert a font file into a data URI.

function getFontDataURI(loc) {
	try {
		return toDataURI(fs.readFileSync(loc), mime.lookup(loc, 'text/unknown'));
	} catch (e) {
		return "";
	}
}

// Normalize a font type into a set of known types.

function normalizeFontType (type) {
	switch (type) {
		case 'bolditalic': case 'italicbold': case 'obliquebold': case 'boldoblique':
			return 'bolditalic';
		case 'bold':
			return 'bold';
		case 'italic': case 'oblique':
			return 'italic';
		default:
			return 'regular';
	}
}

function buildFontString(name, css, formats) {
	var str = util.format("\n@font-face{font-family:\"%s\";", name);

	if (css) str += css + ";";

	var format;
	for (var i = 0; i < formats.length; ++i) {
		format = formats[i];
		if (format && format.src) {
			str += util.format("src:url(\"%s\") ", format.src);

			if (format.type) {
				str += util.format("format(\"%s\")", format.type);
			}

			str += "; ";
		}
	}

	str += "}";
	return str;
}

// Model a CSS font that we can convert into a CSS file.

var CSSFont = Class(function () {
	this.init = function (file) {
		this.file = file;
		this.fileBase = path.basename(file, path.extname(file));

		this.name = this.fileBase.trim();
		
		var split = this.name.split(/\-/g);
		if (split.length > 1) {
			this.name = split[0];

			var suffix = normalizeFontType(split[1].toLowerCase());
			
			if (suffix == "bold") {
				this.weight = "bold";
				this.sortOrder = 1;
			} else if (suffix == "italic") {
				this.style = "italic";
				this.sortOrder = 2;
			} else if (suffix == "bolditalic") {
				this.weight = "bold";
				this.style = "italic";
				this.sortOrder = 3;
			}
		}
	}

	this.getCSS = function (target) {
		var svg = getFontDataURI(path.join(path.dirname(this.file), this.fileBase + ".svg")); // IOS < 4.2
		var eot = getFontDataURI(path.join(path.dirname(this.file), this.fileBase + ".eot")); // IE
		var ttf = getFontDataURI(path.join(path.dirname(this.file), this.fileBase + ".ttf")); // Everything else?
		var woff = getFontDataURI(path.join(path.dirname(this.file), this.fileBase + ".woff"));

		var css = "";
		if (this.weight != null) {
				css += "font-weight:" + this.weight + ";";
		}
		if (this.style != null) {
			css += "font-style:" + this.style + ";";
		}
		
		if (target == 'browser-desktop' || target.startsWith("native")) {
			logger.log(util.format("embedding eot and woff font %s -- %s", this.name, this.fileBase));
			return buildFontString(this.name, css, [
				{src: ttf, type: "truetype"}, 
				{src: eot}, 
				{src: woff, type: "woff"}
			]);

			return util.format("\n@font-face{font-family:\"%s\";%ssrc:url(\"%s\") format(\"truetype\");src:url(\"%s\");src:url(\"%s\") format(\"woff\");}", 
				this.name, css, ttf, eot, woff);
		}
		
		if (target == 'browser-mobile') {
			logger.log(util.format("embedding ttf and svg font %s -- %s", this.name, this.fileBase));
			
			return buildFontString(this.name, css, [
				{src: ttf, type: "truetype"}, 
				{svg: svg, type: "svg"}
			]);
		}
		
		return '';
	}
});

/**
 * HTML generation.
 */

// Manifest file.
// (not our manifest.json, it's a html5 manifest for caching)
function generateOfflineManifest (man, appID, version) {
	return util.format("CACHE MANIFEST\n" +
		"\n" +
		"#%s version %s\n" +
		"\n" +
		"CACHE:\n" +
		"%s\n" +
		"\n" +
		"FALLBACK:\n" +
		"\n" +
		"NETWORK:\n" +
		"*\n", appID, version, Object.keys(man).join("\n"));
}

// Compile HTML resources.
function compileHTML (project, opts, target, files, code, cb) {
	logger.log("Compiling html for " + target);

	// filenames starting with build/debug are already in the build directory
	// otherwise they need to be inline-cached into the HTML or copied into the build directory
	var imgCache = {};

	var f = ff(function () {
		if (/^native/.test(target)) {
			f('jsio=function(){window._continueLoad()}');
		} else {
			var compiler = _builder.packager.createCompiler(opts);
			compiler.inferOptsFromEnv('browser');

			var onImgCacheComplete = f.wait();
			var imgTest = /^[^?*:;{}\'"]+\.(png|jpg|jpeg|gif)$/i;
			compiler.preCompress = function (srcTable) {
				for (var key in srcTable) {
					Object.keys(_builder.strings.getStrings(srcTable[key].src)).forEach(function (str) {
						try {
							var match = str.match(imgTest);
							if (match) {
								imgCache[str] = toDataURI(fs.readFileSync(path.resolve(opts.fullPath, str)), mime.lookup(str, 'image/png'));
							}
						} catch (e) {
							logger.error(e);
						}
					});
				}

				onImgCacheComplete();
			};

			compiler.compile('gc.browser.bootstrap.launchBrowser', f());
		}

		fs.readFile(STATIC_BOOTSTRAP_CSS, 'utf8', f());
		fs.readFile(STATIC_BOOTSTRAP_JS, 'utf8', f());

		// JavaScript cache object.
		var cache = {};
		var fontList = [];

		f(cache);
		f(fontList);

		// Iterate file resources.
		files.resources.forEach(function (info) {
			var f2 = ff(function () {
				fs.exists(info.fullPath, f2.slotPlain());
			}, function (exists) {
				if (!exists) {
					logger.warn(info.fullPath, "does not exist");
					f2.succeed();
				} else if (info.ext == '.ttf') {
					logger.log("adding font", info.relative);
					fontList.push(new CSSFont(info.fullPath));
					f2.succeed();
				} else if (info.ext == '.css') {
					// TODO
				} else if (info.ext == '.js' || info.ext == '.json') {
					fs.readFile(info.fullPath, 'utf-8', f2());
				} else {
					f2.succeed();
				}
			}, function (contents) {
				if (info.ext == '.json') {
					// validate and remove whitespace:
					contents = JSON.stringify(JSON.parse(contents));
				}

				cache[info.relative] = contents;
			}).cb(f());
		});
	}, function (preloadJS, bootstrapCSS, bootstrapJS, cache, fontList) {
		logger.log("built cache.");

		// HTML resources we will generate as a result of this function.
		var resources = {};
		f(cache);
		f(resources);

		// Stub out resources for the offline manifest to recognize.
		files.resources.forEach(function (info) {
			if (!(info.relative in cache)) {
				resources[info.relative] = {
					src: info.fullPath
				};
			}
		});

		files.sprites.forEach(function (info) {
			resources[info.relative] = true;
		});

		// CSS
		var css = [
			bootstrapCSS
		];

		// JavaScript
		var preloader = [
			_builder.packager.getJSConfig(project, opts, target),
			bootstrapJS,
			util.format("bootstrap('%s', '%s')", INITIAL_IMPORT, target)
		];
	
		// Font CSS has to be sorted in proper order: bold and italic
		// version must come *after* the regular version. A standard
		// string sort will take care of this, assuming names like
		//     Ubuntu.ttf
		//     Ubuntu-Bold.ttf
		fontList.sort(function (a, b) {
			return a.sortOrder - b.sortOrder;
		});
		fontList.forEach(function (font) {
			css.push(font.getCSS(target));
		});
		
		// Google Analytics for release.
		if(!opts.debug && project.manifest.googleAnalyticsAccount) {
			var formattedGACode = util.format(STATIC_GA_JS, project.manifest.googleAnalyticsAccount, project.manifest.studio.domain);
			preloader.push(formattedGACode);
		}
		
		// Condense resources.
		var cssSrc = css.join("\n");
		var preloadSrc = preloader.join(";");

		if (opts.compress) {
			_builder.packager.compressCSS(cssSrc, f());

			var compiler = _builder.packager.createCompiler(opts);
			compiler.inferOptsFromEnv('browser');

			var onCompress = f();
			compiler.compress('[bootstrap]', preloadSrc, function (err, src) {
				compiler.strip(src, function (err, src) {
					onCompress(null, src + ';' + preloadJS);
				});
			});
		} else {
			f(cssSrc, preloadSrc + ';' + preloadJS);
		}
	}, function (cache, resources, css, js) {

		// Create HTML document.
		var html = [];
		
		// Check if there is a manifest.
		html.push("<!DOCTYPE html>");
		html.push("<html>");
		html.push("<head>");
		html.push("<title>" + project.manifest.title + "</title>");
		
		// Targeting mobile browsers requires viewport settings.
		if (target == 'browser-mobile') {
			if (!project.manifest.scaleDPR) {
				html.push("<meta name='viewport' content='user-scalable=no,target-densitydpi=low' />");
			} else {
				html.push("<meta name='viewport' content='user-scalable=no,target-densitydpi=device-dpi' />");
			}

			// Various iOS mobile settings for installing as a top application.
			html.push('<meta name="apple-mobile-web-app-capable" content="yes"/>')

			// Apple Touch icons
			var ios_icons = project.manifest.ios && project.manifest.ios.icons;
			if (ios_icons) {
				var largest = 0;
				for (var size in ios_icons) {
					var int_size = parseInt(size);
					if (int_size > largest) {
						largest = int_size;
					}
				}
				if (largest > 0) {
					html.push('<link rel="apple-touch-icon" href="' + toDataURI(fs.readFileSync(path.join(project.paths.root, ios_icons[largest.toString()])), 'image/png') + '">');
				}
			}

			// Apple Touch startup image
			var splash = project.manifest.splash;
			var splash_path = splash["portrait480"];
			if (!splash_path) splash_path = splash["portrait960"];
			if (!splash_path) splash_path = splash["portrait1024"];
			if (!splash_path) splash_path = splash["portrait1136"];
			if (!splash_path) splash_path = splash["portrait2048"];
			if (!splash_path) splash_path = splash["landscape768"];
			if (!splash_path) splash_path = splash["landscape1536"];
			if (splash_path) {
				html.push('<link rel="apple-touch-startup-image" href="' + toDataURI(fs.readFileSync(path.join(project.paths.root, splash_path)), 'image/png') + '">');
			}
		}
		
		// Finish writing HTML file.
		html.push(
			"<style>" + css + "</style>",
			"</head>",
			"<body>",
			"</body>",
			"<script>" + 'IMG_CACHE=' + JSON.stringify(imgCache) + ";" + js + "</script>",
			"</html>");

		// Filenames.
		var indexName = 'index.html';
		var manifestName = target + ".manifest";
		var jsName = target + ".js";
		
		// Final package is three files.
		resources[indexName] = {contents: html.join('')};
		resources[jsName] = {contents: "CACHE=" + JSON.stringify(cache) + ";\n" + code + "; jsio('import " + INITIAL_IMPORT + "');"};
		resources[manifestName] = {contents: generateOfflineManifest(resources, project.manifest.appID, opts.version)};
		
		// Pass compiled resources to callback.
		f.succeed(resources);
	}).error(function (err) {
		logger.error("unexpected error:");
		console.error(err.stack);
	}).cb(cb);
};

exports.writeResources = function (opts, resources, cb) {
	var f = ff(function () {
		var keys = Object.keys(resources);
		var i = 0;
		var onCopy = f.wait();
		var key;

		function writeNext() {
			if (key) {
				logger.log("wrote", key);
			}

			key = keys[i++];

			if (!key) {
				onCopy();
				return;
			}

			var outFile = path.join(opts.output, key);
			wrench.mkdirSyncRecursive(path.dirname(outFile));

			if (resources[key] == true) {
				// logger.warn("No resource provided for", key);
				writeNext();
			} else if ('contents' in resources[key]) {
				fs.writeFile(outFile, resources[key].contents, writeNext);
			} else {
				var src = resources[key].src;
				var dest = outFile;
				if (src && src != dest) {
					_builder.common.child('cp', ['-p', src, dest], {cwd: opts.fullPath}, writeNext);
				}
			}
		}

		writeNext();
	}).cb(cb);
}


exports.compileHTML = compileHTML;
