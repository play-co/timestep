// this file is included at the end of the embedded JS

// it's responsible for initializing the js.io environment

;(function() {
	function getCwd() { return NATIVE.location.substring(0, NATIVE.location.lastIndexOf('/') + 1) + 'code/__cmd__/'; }
	NATIVE.console.log(NATIVE.location);

	var mobileEnv = function(util) {
		var SLICE = Array.prototype.slice,
			cwd = null;

		this.name = /android/.test(GLOBAL.userAgent) ? 'android' : 'ios';

		this.global = GLOBAL;
		this.global.jsio = jsio;

		this.log = function() { NATIVE.console.log(SLICE.call(arguments).join(' ')); }
		this.getCwd = getCwd;
		this.getPath = function() { return './sdk/jsio/'; };
		this.eval = function(code, path) { return NATIVE.eval(code, path); };
		this.fetch = function(filePath) { return false; }
	}

//TODO detect which name to pass
	jsio.setEnv(mobileEnv);

	// jsio.path.add('./sdk');
	// jsio.path.add('./sdk/gc/api');
	// jsio.path.add('./sdk/lib');
	// jsio.path.add('.');
})();
