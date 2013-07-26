var path = require('path');
var fs = require('fs');
var clc = require('cli-color');
var read = require('read');
var ff = require('ff');

function getTealeafIOSPath(builder, next) {
	var dir = builder.common.config.get('ios.root');
	if (dir && fs.existsSync(dir) && fs.existsSync(path.join(dir, "tealeaf"))) {
		return next(dir);
	}

	console.error( '       Cannot locate tealeaf-ios. Set the variable\n'
				 + '       ios.root in basil/config.json that the path exists.\n'
				 + '       Currently set to: ' + dir + '\n\n');

	read({prompt: 'Manually enter the path to tealeaf-ios (or hit return to abort): '}, function (err, dir) {
		if (dir && fs.existsSync(dir) && fs.existsSync(path.join(dir, "tealeaf"))) {
			return next(dir);
		}

		console.error('iOS addon not found');
		process.exit(2);
	})
}

exports.package = function(builder, project, opts, next) {
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

	builder.common.track("BasilBuildNativeIOS", {"clean":argv.clean, "debug":argv.debug, "compress":opts.compress});

	getTealeafIOSPath(builder, function(dir) {
		require(path.join(dir, "build")).build(builder, project, opts, next);
	});
};

