function bootstrap(initialImport, target) {
	var w = window;
	var d = document;
	var loc = w.location;
	var q = loc.search + loc.hash;

	// check to see if we need chrome frame
	if (target && (target=="desktop" || target=="facebook") && /MSIE/i.test(navigator.userAgent) && !d.createElement('canvas').getContext) {
		var chromeframe_url = 'chromeframe.html' + (loc.search ? loc.search + "&" : "?") + "target="+ target;
		bootstrap = function() {};
		try {
			var obj = new ActiveXObject('ChromeTab.ChromeFrame');
			if (!obj) {
				throw "bad object";
			}
			loc.replace(chromeframe_url);
		} catch(e) {
			w.onload = function() {
				var e = d.createElement('script'); 
				e.async = true;
			    e.src = "http://ajax.googleapis.com/ajax/libs/chrome-frame/1/CFInstall.min.js";
				e.onreadystatechange= function () {
					if (this.readyState == 'loaded') {
						CFInstall.check({
							mode: "overlay",
							oninstall: function() { loc.replace(chromeframe_url) },
							url: "http://www.google.com/chromeframe/eula.html?user=true"
						});
					}
				}
				d.getElementsByTagName('head')[0].appendChild(e);
			}
		}
		return;
	}
	
	// for tracking when the page started loading
	w.__initialTime = +new Date();

	try {
		// override any config params provided already
		if (w.CONFIG_OVERRIDES) {
			for (var key in w.CONFIG_OVERRIDES) {
				w.CONFIG[key] = w.CONFIG_OVERRIDES[key];
			}
		}

		var uri = decodeURIComponent((w.location.search || '?').substr(1));
		if (uri[0] == '{') {
			// override any config params in the URL
			var overrideCONFIG = JSON.parse(uri);
			if (overrideCONFIG) {
				for (var key in overrideCONFIG) {
					w.CONFIG[key] = overrideCONFIG[key];
				}
			}
		}
	} catch(e) {
		
	}
	
	if (w.CONFIG.CDNURL) {
		d.write('<base href="' + w.CONFIG.CDNURL + '">');
	}
	
	// figure out the dpr
	if (w.CONFIG.scaleDPR === false) {
		var scale = 1;
	} else {
		var scale = (1 / (w.devicePixelRatio || 1));
	}

	// figure out the device type
	var ua = navigator.userAgent;
	var mobile = (/(iPod|iPhone|iPad)/i.test(ua) ? 'ios' : /BlackBerry/.test(ua) ? 'blackberry' : /Mobile Safari/.test(ua) ? 'android' : '');

	if (loc.search.match(/exportSettings=true/)) {
		// just export localStorage
		exportSettings();
	} else if (mobile != 'blackberry' && !w.CONFIG.noRedirect) {
		// redirect based on device
		if (mobile && target != 'browser-mobile') {
			return loc.replace('//' + loc.host + '/browser-mobile/' + loc.hash);
		} else if (!mobile && target == 'browser-mobile') {
			return loc.replace('//' + loc.host + '/browser-desktop/' + loc.hash);
		}
	}
	
	// set the viewport
	if (mobile == 'ios') {
		// Using initial-scale on android makes everything blurry! I think only IOS
		// correctly uses devicePixelRatio.  Medium/high-res android seems to set
		// the dpr to 1.5 across the board, regardless of what the dpr should actually
		// be...
		d.write('<meta name="viewport" content="'
				+ 'user-scalable=no'
				+ ',initial-scale=' + scale
				+ ',maximum-scale=' + scale
				+ ',minimum-scale=' + scale
				+ ',width=device-width'
			+ '" />');

		// detect ios operating system version
		var match = ua.match(/iPhone OS ([0-9]+)/);
		var iosVersion = match && parseInt(match[1]);
	}
	
	if (!Image.get) {
		Image.set = function(url, img) { CACHE[url] = img; };
		Image.get = function(url) { return CACHE[url]; };
	}

	var canHideAddressBar = !(iosVersion && iosVersion >= 7);
	
	w.hideAddressBar = function() {
		if (!mobile) { return; }
		
		d.body.style.height = 2 * screen.height + 'px';
		if (mobile == 'ios') {
			w.scrollTo(0, 1);
			w.scrollTo(0, 0);
		} else {
			w.scrollTo(0, 1);
		}
		d.body.offsetHeight;
	}

	hideAddressBar();
	var min = w.innerHeight;

	var loaded = false;
	w._continueLoad = function() {
		if (!loaded) {
			loaded = true;
			var el = d.createElement('script');
			el.src = target + '.js';
			d.getElementsByTagName('head')[0].appendChild(el);
		}
	};

	var fontsLoaded;
	if (CONFIG.embeddedFonts) {
		var defaultWidth = 0;
		var fontNodes = [];
		for (var i = 0, n = CONFIG.embeddedFonts.length; i < n; ++i) {
			var font = CONFIG.embeddedFonts[i];
			var el = d.body.appendChild(d.createElement('span'));
			el.innerHTML = 'giItT1WQy@!-/#';
			el.style.cssText = 'position:absolute;left:-9999px;font-size:100px;visibility:hidden;';
			if (!defaultWidth) {
				defaultWidth = el.offsetWidth;
			}
			el.style.fontFamily = font;
			fontNodes.push(el);
		}
	} else {
		fontsLoaded = true;
	}

	// after load, we poll for the correct document height
	w.onload = function() {
		var now = +new Date();
		var increased = false;
		var poll = setInterval(function() {
			hideAddressBar();
			var h = w.innerHeight;
			if (fontNodes) {
				var isLoaded = true;
				for (var i = 0, n = fontNodes.length; i < n; ++i) {
					if (fontNodes[i].offsetWidth == defaultWidth) {
						isLoaded = false;
						break;
					}
				}

				if (isLoaded) {
					fontsLoaded = true;
				}
			}
			
			// timeout after 1 second and assume we have the right height, or 
			// note when the height increases (we scrolled) and launch the app
			if (h == min && increased && fontsLoaded || +new Date() - now > 5000 || !canHideAddressBar) {
				if (mobile == 'android') {
					w.scrollTo(0, -1);
				}

				clearInterval(poll);

				setTimeout(function () {
					jsio("import gc.browser.bootstrap.launchBrowser");
				}, 0);
			}

			// some android phones report correctly first, then shrink the height
			// to fit the address bar. always reset min
			if (h > min) { increased = true; }
			min = h;
		}, 50);
	}
}
