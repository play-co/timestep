
exports.show = function() {
	NATIVE.statusBar && NATIVE.statusBar.show && NATIVE.statusBar.show();
};

exports.hide = function() {
	NATIVE.statusBar && NATIVE.statusBar.hide && NATIVE.statusBar.hide();
};
