
exports.show = function() {
	NATIVE.statusBar && NATIVE.statusBar.showStatusBar && NATIVE.statusBar.showStatusBar();
};

exports.hide = function() {
	NATIVE.statusBar && NATIVE.statusBar.hideStatusBar && NATIVE.statusBar.hideStatusBar();
};

exports.getHeight = function () {
	return NATIVE.statusBar && NATIVE.statusBar.statusBarHeight;
}
