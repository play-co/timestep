/** @license
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
var STATIC_SPINNER_HTML = path.join(__dirname, 'browser-static/spinner.html');

function merge(base, extra) {
	base = base || {};

	for (var i = 1, len = arguments.length; i < len; ++i) {
		var copyFrom = arguments[i];
		for (var key in copyFrom) {
			if (copyFrom.hasOwnProperty(key) && !base.hasOwnProperty(key)) {
				base[key] = copyFrom[key];
			}
		}
	}
}

function extract(obj, keys) {
	var ret = {};
	keys.forEach(function (key) {
		ret[key] = obj[key];
	});
	return ret;
}

var _builder;
var _paths;
var logger;
exports.build = function (builder, project, subtarget, moreOpts, cb) {

	var argParser = require('optimist')(process.argv)
		.alias('baseURL', 'u').describe('baseURL', 'all relative resources except for index should be loaded from this URL')

	var argv = argParser.argv;

	var target = 'browser-' + subtarget;
	var browserOpts = project.manifest.browser || {};

	merge(browserOpts, {
		// include a base64-inline image for the apple-touch-icon meta tag (if webpage is saved to homescreen)
		appleTouchIcon: true,
		appleTouchStartupImage: true,

		// embed a base64 splash screen (background-size: cover)
		embedSplash: true,
		cache: [],
		copy: [],
		baseURL: argv.baseURL || ''
	});

	if (browserOpts.spinner) {
		merge(browserOpts.spinner, {x: '50%', y: '50%', width: '120px', height: '120px', color0: 'rgba(255, 255, 255, 0.2)', color1: '#FFF'});

		// convert numbers to numbers with units
		['width', 'height'].forEach(function (key) {
			var match = browserOpts.spinner[key].match(/^-?[0-9.]+(.*)$/);
			browserOpts.spinner[key] = {
				value: parseFloat(browserOpts.spinner[key]),
				unit: match && match[1] || 'px'
			};
		});
	}

	var buildOpts = builder.packager.getBuildOptions({
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

		compress: moreOpts.compress,

		cache: browserOpts.cache,
		copy: browserOpts.copy,

		baseURL: browserOpts.baseURL
	});

	merge(buildOpts, extract(browserOpts, ['appleTouchIcon', 'appleTouchStartupImage', 'embedSplash', 'spinner']));

	exports.runBuild(builder, project, buildOpts, function (err, res) {
		cb(err, {
			buildOpts: buildOpts,
			res: res
		});
	});
};

exports.runBuild = function (builder, project, buildOpts, cb) {
	_builder = builder;
	logger = new _builder.common.Formatter('build-browser');

	// The following build opts are used for normal builds, but also simulated
	// native builds that require an html file so we can't add them in the
	// exports.build function

	// html to insert
	buildOpts.headHTML = [];
	buildOpts.bodyHTML = [];
	buildOpts.footerHTML = [];

	if (buildOpts.debug) {
		buildOpts.version = Date.now() + '&' + Math.random();
	}

	var f = ff(function () {
		// Exclude jsio in browser builds (we include it separately)
		buildOpts.excludeJsio = !buildOpts.isSimulated;

		_builder.packager.compileResources(project, buildOpts, INITIAL_IMPORT, f());
	}, function (pkg) {
		compileHTML(project, buildOpts, buildOpts.target, pkg.files, pkg.jsSrc, f());
	}, function (resources) {
		// Resources built, write out.
		logger.log('Writing resources...');
		exports.writeResources(buildOpts, resources, f());
	}, function () {
		logger.log('Archive built.');
	}).cb(cb);
};

/**
 * Utilities
 */

function toDataURI (data, mime) {
	return 'data:' + mime + ';base64,' + new Buffer(data).toString('base64');
}

/**
 * Font embedding.
 */

// Convert a font file into a data URI.
function getFontDataURI(loc) {
	try {
		return toDataURI(fs.readFileSync(loc), mime.lookup(loc, 'text/unknown'));
	} catch (e) {
		return '';
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
	var str = util.format('\n@font-face{font-family:"%s";', name);

	if (css) str += css + ';';

	var format;
	for (var i = 0; i < formats.length; ++i) {
		format = formats[i];
		if (format && format.src) {
			str += util.format('src:url("%s") ', format.src);

			if (format.type) {
				str += util.format('format("%s")', format.type);
			}

			str += '; ';
		}

		if (format && format.url) {
			str += util.format('src:url("%s");', format.url);
		}
	}

	str += '}';
	return str;
}

// Model a CSS font that we can convert into a CSS file.
var CSSFont = Class(function () {

	var exts = {
		'.svg': 'svg', // IOS < 4.2
		'.eot': '', // IE
		'.ttf': 'truetype', // Everything else?
		'.woff': 'woff',
	};

	this.init = function (file) {
		this.file = file;
		this.fileBase = path.basename(file, path.extname(file));

		this.name = this.fileBase.trim();

		var split = this.name.split(/\-/g);
		if (split.length > 1) {
			this.name = split[0];

			var suffix = normalizeFontType(split[1].toLowerCase());

			if (suffix == 'bold') {
				this.weight = 'bold';
				this.sortOrder = 1;
			} else if (suffix == 'italic') {
				this.style = 'italic';
				this.sortOrder = 2;
			} else if (suffix == 'bolditalic') {
				this.weight = 'bold';
				this.style = 'italic';
				this.sortOrder = 3;
			}
		}
	}

	this.getCSS = function (opts, target) {
		var fileBase = this.fileBase;
		var dirname = path.dirname(this.file);

		var fontData = {};
		Object.keys(exts).forEach(function (ext) {
			fontData[ext] = getFontDataURI(path.join(dirname, fileBase + ext));
		}, this);

		var css = '';
		if (this.weight != null) {
			css += 'font-weight:' + this.weight + ';';
		}
		if (this.style != null) {
			css += 'font-style:' + this.style + ';';
		}

		// target.startsWith('native') -- for simulated native builds
		if (target == 'browser-desktop' || target.startsWith('native')) {
			logger.log(util.format('embedding ttf, eot, and woff font %s -- %s', this.name, this.fileBase));
			var formats = [];
			addFormat(formats, '.ttf');
			addFormat(formats, '.eot');
			addFormat(formats, '.woff');
			return buildFontString(this.name, css, formats);
		}

		if (target == 'browser-mobile') {
			logger.log(util.format('embedding ttf and svg font %s -- %s', this.name, this.fileBase));

			var formats = [];
			addFormat(formats, '.ttf');
			addFormat(formats, '.svg');
			return buildFontString(this.name, css, formats);
		}

		function addFormat(formats, ext) {
			if (fontData[ext]) {
				if (opts.embedFonts) {
					var def = {src: fontData[ext]};
					if (exts[ext]) {
						def.type = exts[ext];
					}

					formats.push(def);
				} else {
					formats.push({url: 'resources/fonts/' + fileBase + ext});
				}
			}
		}

		return '';
	}
});

/**
 * HTML generation.
 */

// Manifest file.
// (not our manifest.json, it's a html5 manifest for caching)
function generateOfflineManifest (opts, man, appID, version) {
	var url = require('url');
	return util.format('CACHE MANIFEST\n' +
		'\n' +
		'#%s version %s\n' +
		'\n' +
		'CACHE:\n' +
		(opts.cache ? opts.cache.join('\n') + '\n' : '') +
		'%s\n' +
		'\n' +
		'FALLBACK:\n' +
		'\n' +
		'NETWORK:\n' +
		'*\n', appID, version, Object.keys(man).map(function (line) {
			if (opts.baseURL) {
				return url.resolve(opts.baseURL, line);
			} else {
				return line;
			}
		}).join('\n'));
}

function generateGameHTML (opts, project, target, imgCache, js, css) {

	function getBase64Image(filename) {
		return toDataURI(fs.readFileSync(path.resolve(project.paths.root, filename)), mime.lookup(filename));
	}

	// Apple Touch startup image

	// browser splash
	var browserSplash = project.manifest.browser && project.manifest.browser.splash;
	if (!browserSplash) {
		var splashOpts = project.manifest.splash;
		var splashPaths = ['landscape1536', 'landscape768', 'portrait2048', 'portrait1136', 'portrait1024', 'portrait960', 'portrait480'];
		var i = splashPaths.length;
		browserSplash = splashOpts[splashPaths[--i]];
		while (i && !browserSplash) {
			browserSplash = splashOpts[splashPaths[--i]];
		}
	}

	// Create HTML document.
	var html = [];

	// Check if there is a manifest.
	html.push('<!DOCTYPE html>');

	if (opts.debug) {
		html.push('<html>');
	} else {
		html.push('<html manifest="' + opts.target + '.manifest">');
	}

	html.push(
		'<head>',
		opts.baseURL ? '<base href="' + opts.baseURL + '">' : '',
		'<title>' + project.manifest.title + '</title>'
	);

	// Targeting mobile browsers requires viewport settings.
	if (target == 'browser-mobile') {
		if (!project.manifest.scaleDPR) {
			html.push('<meta name="viewport" content="user-scalable=no,target-densitydpi=low" />');
		} else {
			html.push('<meta name="viewport" content="user-scalable=no,target-densitydpi=device-dpi" />');
		}

		// Various iOS mobile settings for installing as a top application.
		html.push('<meta name="apple-mobile-web-app-capable" content="yes"/>')

		if (opts.appleTouchIcon) {
			// Apple Touch icons
			var iosIcons = project.manifest.ios && project.manifest.ios.icons;
			if (iosIcons) {
				var largest = 0;
				for (var size in iosIcons) {
					var intSize = parseInt(size);
					if (intSize > largest) {
						largest = intSize;
					}
				}
				if (largest > 0) {
					html.push('<link rel="apple-touch-icon" href="' + getBase64Image(iosIcons[largest.toString()]) + '">');
				}
			}
		}

		if (opts.appleTouchStartupImage && browserSplash) {
			html.push('<link rel="apple-touch-startup-image" href="' + getBase64Image(browserSplash) + '">');
		}
	}

	try {
		var spriteMap = fs.readFileSync(path.join(opts.output, 'spritesheets/map.json'), 'utf8');
		imgCache['spritesheets/map.json'] = spriteMap.toString('utf8');
	} catch (e) {
		// No spritemap found...
	}

	// Finish writing HTML file.
	html.push(
		'<style>' + css + '</style>',
		opts.headHTML.join('\n') || '',
		'</head>',
		'<body>',
		opts.bodyHTML.join('\n') || ''
	);

	if (opts.embedSplash) {
		html.push('<div id="_GCSplash" style="-webkit-transition:opacity 1s;position:absolute;top:0px;left:0px;width:100%;height:100%;z-index:1;background:#000 url(\'' + getBase64Image(browserSplash) + '\') no-repeat;background-size:cover">');
		if (opts.spinner) {
			html.push(
				fs.readFileSync(STATIC_SPINNER_HTML, 'utf8')
					.replace(/\[\[x\]\]/g, opts.spinner.x)
					.replace(/\[\[y\]\]/g, opts.spinner.y)
					.replace(/\[\[width\]\]/g, opts.spinner.width.value + opts.spinner.width.unit)
					.replace(/\[\[height\]\]/g, opts.spinner.height.value + opts.spinner.height.unit)
					.replace(/\[\[offsetX\]\]/g, -opts.spinner.width.value / 2 + opts.spinner.width.unit)
					.replace(/\[\[offsetY\]\]/g, -opts.spinner.height.value / 2 + opts.spinner.height.unit)
					.replace(/\[\[color0\]\]/g, opts.spinner.color0)
					.replace(/\[\[color1\]\]/g, opts.spinner.color1)
			);
		}

		html.push('</div>');
	}

	html.push(
		'</body>',
		opts.footerHTML.join('\n') || '',
		'<script>IMG_CACHE=' + JSON.stringify(imgCache) + ';' + js + '</script>',
		'</html>'
	);

	return html.join('');
}

function generateIndexHTML(opts, project) {
	var html = [];

	html.push(
		'<!DOCTYPE html>',
		'<html>',
		'<head>',
		'<title>' + project.manifest.title + '</title>'
	);

	var size = (project.manifest && project.manifest.supportedOrientations &&
					(project.manifest.supportedOrientations[0] === 'portrait')) ?
					{width: 320, height: 480} : {width: 480, height: 320};

	html.push(
		'</head>',
		'<body>',
		'<iframe width="' + size.width + '" height="' + size.height + '" src="game.html" style="display:block;border:0;margin:0 auto;"></iframe>',
		'</body>',
		'</html>'
	);

	return html.join('\n');
}

// Compile HTML resources.
function compileHTML (project, opts, target, resources, code, cb) {
	logger.log('Compiling html for ' + target);

	// filenames starting with build/debug are already in the build directory
	// otherwise they need to be inline-cached into the HTML or copied into the build directory
	var imgCache = {};

	var f = ff(function () {
		if (/^native/.test(target)) {
			f('jsio=function(){window._continueLoad()}');
		} else {
			var next = f();
			_builder.packager.createCompiler(project, opts, function (compiler) {
				compiler.inferOptsFromEnv('browser');

				var onImgCacheComplete = f.wait();
				var imgTest = /^[^?*:;{}\'"]+\.(png|jpg|jpeg|gif)$/i;
				compiler.preCompress = function (srcTable) {
					for (var key in srcTable) {
						Object.keys(_builder.strings.getStrings(srcTable[key].src)).forEach(function (str) {
							try {
								var match = str.match(imgTest);
								if (match) {
									// console.log("skipping image cache:", str);
									// imgCache[str] = toDataURI(fs.readFileSync(path.resolve(opts.fullPath, str)), mime.lookup(str, 'image/png'));
								}
							} catch (e) {
								logger.error(e);
							}
						});
					}

					onImgCacheComplete();
				};

				compiler.compile('gc.browser.bootstrap.launchBrowser', next);
			});

		}

		fs.readFile(STATIC_BOOTSTRAP_CSS, 'utf8', f());
		fs.readFile(STATIC_BOOTSTRAP_JS, 'utf8', f());

		// JavaScript cache object.
		var cache = {};
		var fontList = [];

		f(cache);
		f(fontList);

		// Iterate file resources.
		resources.other.forEach(function (info) {
			var f2 = ff(function () {
				fs.exists(info.fullPath, f2.slotPlain());
			}, function (exists) {
				if (!exists) {
					logger.warn(info.fullPath, 'does not exist');
					f2.succeed();
				} else if (info.ext == '.ttf') {
					logger.log('adding font', info.relative);
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
					try {
						contents = JSON.stringify(JSON.parse(contents));
					} catch (e) {
						logger.error('invalid JSON:', info.fullPath);
					}
				}

				cache[info.relative] = contents;
			}).cb(f.wait())
				.error(function (e) {
					logger.error(e);
				});
		});
	}, function (preloadJS, bootstrapCSS, bootstrapJS, cache, fontList) {
		f(preloadJS, bootstrapCSS, bootstrapJS, cache, fontList);

		opts.embeddedFonts = fontList.map(function (font) { return font.name; });
		_builder.packager.getJSConfig(project, opts, target, f.slotPlain());
	}, function (preloadJS, bootstrapCSS, bootstrapJS, cache, fontList, jsConfig) {
		logger.log('built cache.');

		// HTML resources we will generate as a result of this function.
		var resourceMap = {};
		f(cache);
		f(resourceMap);

		// Stub out resources for the offline manifest to recognize.
		resources.other.forEach(function (info) {
			if (!(info.relative in cache)) {
				resourceMap[info.relative] = {
					src: info.fullPath
				};
			}
		});

		resources.images.forEach(function (info) {
			resourceMap[info.relative] = true;
		});

		// CSS
		var css = [
			bootstrapCSS
		];

		// JavaScript
		var preloader = [
			jsConfig,
			bootstrapJS,
			util.format('bootstrap("%s", "%s")', INITIAL_IMPORT, target)
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
			css.push(font.getCSS(opts, target));
		});

		// Google Analytics for release.
		if(!opts.debug && project.manifest.googleAnalyticsAccount) {
			var formattedGACode = util.format(STATIC_GA_JS, project.manifest.googleAnalyticsAccount, project.manifest.studio.domain);
			preloader.push(formattedGACode);
		}

		// Condense resources.
		var cssSrc = css.join('\n');
		var preloadSrc = preloader.join(';');

		if (opts.compress) {
			_builder.packager.compressCSS(cssSrc, f());

			var onCompress = f();
			var compiler = _builder.packager.createCompiler(project, opts, function (compiler) {
				compiler.inferOptsFromEnv('browser');
				compiler.compress('[bootstrap]', preloadSrc, function (err, src) {
					compiler.strip(src, function (err, src) {
						onCompress(null, src + ';' + preloadJS);
					});
				});
			});
		} else {
			f(cssSrc, preloadSrc + ';' + preloadJS);
		}
	}, function (cache, resourceMap, css, js) {

		// Filenames.
		var indexName = 'index.html';
		var gameName = 'game.html';
		var manifestName = target + '.manifest';
		var jsName = target + '.js';

		if (target === 'browser-desktop') {
			resourceMap[gameName] = {contents: generateGameHTML(opts, project, target, imgCache, js, css)};
			resourceMap[indexName] = {contents: generateIndexHTML(opts, project)};
		} else {
			resourceMap[indexName] = {contents: generateGameHTML(opts, project, target, imgCache, js, css)};
		}

		resourceMap[jsName] = {contents: 'NATIVE=false;CACHE=' + JSON.stringify(cache) + ';\n' + code + '; jsio("import ' + INITIAL_IMPORT + '");'};
		resourceMap[manifestName] = {contents: generateOfflineManifest(opts, resourceMap, project.manifest.appID, opts.version)};

		// If copy step is requested,
		if (opts && opts.copy) {
			opts.copy.forEach(function (resource) {
				resourceMap[resource] = {src: path.join(opts.fullPath, resource)};
			});
		}

		// Pass compiled resources to callback.
		f.succeed(resourceMap);
	}).error(function (err) {
		logger.error('unexpected error:', err);
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
				logger.log('wrote', key);
			}

			key = keys[i++];

			if (!key) {
				onCopy();
				return;
			}

			var outFile = path.join(opts.output, key);
			wrench.mkdirSyncRecursive(path.dirname(outFile));

			if (resources[key] == true) {
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
