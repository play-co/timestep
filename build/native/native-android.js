var path = require('path');
var fs = require('fs');
var clc = require('cli-color');
var read = require('read');
var ff = require('ff');

function getTealeafAndroidPath(builder, next) {
	var dir = builder.common.config.get('android.root');
	if (dir && fs.existsSync(dir) && fs.existsSync(path.join(dir, "TeaLeaf"))) {
		return next(dir);
	}

	console.error( '       Cannot locate android. Set the variable\n'
				 + '       android.root in basil/config.json that the path exists.\n'
				 + '       Currently set to: ' + dir + '\n\n');

	read({prompt: 'Manually enter the path to gc android (or hit return to abort): '}, function (err, dir) {
		if (dir && fs.existsSync(dir) && fs.existsSync(path.join(dir, "TeaLeaf"))) {
			return next(dir);
		}

		console.error('Android addon not found');
		process.exit(2);
	});
}

exports.package = function(builder, project, opts, next) {
	var argParser = require('optimist')
		.alias('help', 'h').describe('help', 'Display this help menu')
		.alias('install', 'i').describe('install', 'Launch `adb install` after build completes').boolean('install').default('install', false)
		.alias('open', 'o').describe('open', 'Launch the app on the phone after build completes (implicitly installs)').boolean('open').default('open', false)
		.alias('debug', 'd').describe('debug', 'Create debug build').boolean('debug').default('debug', opts.template === "debug")
		.alias('logging', 'l').describe('logging', 'Enable JavaScript logging in release mode').boolean('logging').default('logging', false)
		.alias('clean', 'c').describe('clean', 'Clean build before compilation').boolean('clean').default('clean', opts.template !== "debug")
		.alias('clearstorage', 's').describe('clearstorage', 'Clear localStorage on device').boolean('clearstorage').default('clearstorage', false);
	var argv = argParser.argv;

	// If --help is being requested,
	if (argv.help) {
		argParser.showHelp();
		return;
	}

	// Merge command-line arguments into build options
	opts.argv = argv;

	builder.common.track("BasilBuildNativeAndroid", {"clean":argv.clean, "debug":argv.debug, "compress":opts.compress});

	getTealeafAndroidPath(builder, function(dir) {
		require(path.join(dir, "build")).build(builder, project, opts, next);
	});
};

