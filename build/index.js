var path = require('path');

exports.init = function (build, cb) {
	build.registerTarget('browser', path.join(__dirname, "browser", "browser"), ['browser-desktop', 'browser-mobile']);
	build.registerTarget('native', path.join(__dirname, "native", "native"), ['native-ios', 'native-android']);
	cb();
}
