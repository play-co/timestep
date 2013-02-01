var path = require('path');

exports.init = function (build, cb) {
	build.registerTarget('browser', path.join(__dirname, "browser", "browser"));
	build.registerTarget('native', path.join(__dirname, "native", "native"));
	cb();
}