var path = require('path');
var ff = require('ff');

// Update this whenever we are targetting a new SDK.  I believe this is correct
// to set here in the build script because if you target the wrong SDK then it
// will not build for the right targets.
var TARGET_SDK = "iphoneos6.0";

var CONFIG_RELEASE = "Release";
var CONFIG_DEBUG = "Debug";

exports.buildApp = function (builder, appName, targetSDK, configurationName, projectPath, next) {
	var f = ff(function() {
		var args = [
			'-target',
			appName,
			'-sdk',
			targetSDK,
			'-configuration',
			configurationName,
			'-jobs',
			8,
		];

		console.log("Invoking xcodebuild with parameters:", JSON.stringify(args, undefined, 4));

		builder.common.child('xcodebuild', args, {
			cwd: path.resolve(projectPath)
		}, f.slotPlain());
	}, function(code) {
		console.log("xcodebuild exited with code", code);

		if (code != 0) {
			f.fail("Build failed.  Is the manifest.json file properly configured?");
		}
	}).cb(next);
};

exports.signApp = function (builder, projectPath, appName, outputIPAPath, configurationName, developerName, provisionPath, next) {
	var f = ff(function() {

		var args = [
			'-sdk',
			'iphoneos',
			'PackageApplication',
			'-v',
			path.resolve(path.join(projectPath, 'build/'+configurationName+'-iphoneos/'+appName+'.app')),
			'-o',
			path.resolve(outputIPAPath),
			'--sign',
			'iPhone Developer: ' + developerName,
			'--embed',
			path.resolve(provisionPath)
		];

		console.log("Invoking xcrun with parameters:", JSON.stringify(args, undefined, 4));

		builder.common.child('xcrun', args, {
			cwd: path.resolve(projectPath)
		}, f.slotPlain());
	}, function(code) {
		console.log("xcrun exited with code", code);

		if (code != 0) {
			f.fail("Unable to sign the app.  Are your provision profile and developer key active?");
		}
	}).cb(next);
};

// This command produces an IPA file by calling buildApp and signApp
exports.buildIPA = function(builder, projectPath, appName, isDebug, provisionPath, developerName, outputIPAPath, next) {
	var configurationName = isDebug ? CONFIG_DEBUG : CONFIG_RELEASE;
	var targetSDK = TARGET_SDK;

	var f = ff(function() {
		exports.buildApp(builder, appName, targetSDK, configurationName, projectPath, f());
	}, function() {
		exports.signApp(builder, projectPath, appName, outputIPAPath, configurationName, developerName, provisionPath, f());
	}).error(function(err) {
		console.error('ERROR:', err);
		process.exit(2);
	}).cb(next);
};

