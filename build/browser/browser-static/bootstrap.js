function bootstrap(initialImport, target) {
	var w = window;
	var d = document;
	var loc = w.location;
	var q = loc.search + loc.hash;

	// check to see if we need chrome frame
	// if (target && (target=="desktop" || target=="facebook") && /MSIE/i.test(navigator.userAgent) && !d.createElement('canvas').getContext) {
	// 	var chromeframe_url = 'chromeframe.html' + (loc.search ? loc.search + "&" : "?") + "target="+ target;
	// 	bootstrap = function() {};
	// 	try {
	// 		var obj = new ActiveXObject('ChromeTab.ChromeFrame');
	// 		if (!obj) {
	// 			throw "bad object";
	// 		}
	// 		loc.replace(chromeframe_url);
	// 	} catch(e) {
	// 		w.onload = function() {
	// 			var e = d.createElement('script');
	// 			e.async = true;
	// 		    e.src = "http://ajax.googleapis.com/ajax/libs/chrome-frame/1/CFInstall.min.js";
	// 			e.onreadystatechange= function () {
	// 				if (this.readyState == 'loaded') {
	// 					CFInstall.check({
	// 						mode: "overlay",
	// 						oninstall: function() { loc.replace(chromeframe_url) },
	// 						url: "http://www.google.com/chromeframe/eula.html?user=true"
	// 					});
	// 				}
	// 			}
	// 			d.getElementsByTagName('head')[0].appendChild(e);
	// 		}
	// 	}
	// 	return;
	// }

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
	var isKik = /Kik\/\d/.test(ua);

	// if (loc.search.match(/exportSettings=true/)) {
	// 	// just export localStorage
	// 	exportSettings();
	// } else if (mobile != 'blackberry' && !w.CONFIG.noRedirect) {
	// 	// redirect based on device
	// 	if (mobile && target != 'browser-mobile') {
	// 		return loc.replace('//' + loc.host + '/browser-mobile/' + loc.hash);
	// 	} else if (!mobile && target == 'browser-mobile') {
	// 		return loc.replace('//' + loc.host + '/browser-desktop/' + loc.hash);
	// 	}
	// }

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

	// TODO: Remove this automatic false. Kik does not always show up in the user agent so
	//       default to not being able to hide the progress bar for now
	var canHideAddressBar = false && !(iosVersion && iosVersion >= 7) && !isKik && mobile;

	w.hideAddressBar = function() {
		if (!mobile || !canHideAddressBar) { return; }

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

	var orientationOk = true;
	var supportedOrientations = CONFIG.supportedOrientations;
	function checkOrientation() {
		var ow = w.outerWidth;
		var oh = w.outerHeight;
		var isPortrait = oh > ow;
		orientationOk = isPortrait && supportedOrientations.indexOf('portrait') != -1
			|| !isPortrait && supportedOrientations.indexOf('landscape') != -1;
	}

	if (mobile && supportedOrientations) {
		checkOrientation();
		// if (!orientationOk) {
		// 	var el = d.body.appendChild(d.createElement('div'));
		// 	el.innerHTML = 'please rotate your phone<br><span style="font-size:200%">\u21bb</span>';
		// 	var width = d.body.offsetWidth;
		// 	el.style.cssText = 'opacity:0;z-index:9000;color:#FFF;background:rgba(40,40,40,0.8);border-radius:25px;text-align:center;padding:' + width / 10 + 'px;font-size:' + width / 20 + 'px;position:absolute;left:50%;width:' + width * 5 / 8 + 'px;margin-left:-' + width * 5 / 16 + 'px;margin-top:80px;pointer-events:none';
		// 	w.addEventListener('resize', function () {
		// 		checkOrientation();
		// 		el.style.display = orientationOk ? 'none': 'block';
		// 	});
		// }
	}

	var appCache = window.applicationCache;
	['cached', 'checking', 'downloading', 'error', 'noupdate', 'obsolete', 'progress', 'updateready'].forEach(function (evt) {
		appCache.addEventListener(evt, handleCacheEvent, false);
	});

	// status 0 == UNCACHED
	// if (appCache.status) {

	// 	appCache.update(); // Attempt to update the user's cache.
	// }

	function handleCacheEvent(evt) {
		if (evt.type == 'updateready') {
			// var el = d.body.appendChild(d.createElement('div'));
			// el.style.cssText = 'opacity:0;position:absolute;z-index:9900000;top:-20px;margin:0px auto'
			// 	+ 'height:20px;width:200px;'
			// 	+ '-webkit-border-radius:0px 0px 5px 5px;'
			// 	+ '-webkit-transition:all 0.7s ease-in-out;'
			// 	+ '-webkit-transform:scale(' + w.devicePixelRatio + ');'
			// 	+ '-webkit-transform-origin:50% 0%;'
			// 	+ '-webkit-box-shadow:0px 2px 3px rgba(0, 0, 0, 0.4);'
			// 	+ 'background:rgba(0,0,0,0.7);color:#FFF;'
			// 	+ 'padding:10px 15px;'
			// 	+ 'font-size: 15px;';
			// 	+ 'text-align: center;';
			// 	+ 'cursor:pointer;';

			// if (CONFIG.embeddedFonts && CONFIG.embeddedFonts.length) {
			// 	el.style.fontFamily = CONFIG.embeddedFonts[0];
			// }

			// el.innerText = 'game updated! tap here';
			// el.style.left = (d.body.offsetWidth - 200) / 2 + 'px';

			// el.setAttribute('noCapture', true); // prevent DevKit from stopping clicks on this event
			// el.addEventListener('click', reload, true);
			// el.addEventListener('touchstart', reload, true);

			// setTimeout(function () {
			// 	el.style.top='0px';
			// 	el.style.opacity='1';
			// }, 0);

			// setTimeout(function () {
			// 	el.style.top='-20px';
			// 	el.style.opacity='0';
			// }, 30000);
			console.log("update ready");

			// reload immediately if splash is still visible
			var splash = d.getElementById('_GCSplash');
			if (splash && splash.parentNode) {
				try { appCache.swapCache(); } catch (e) {}
				//location.reload();
			}
		}
	}

	// after load, we poll for the correct document height
	w.onload = function() {
		var now = +new Date();
		var increased = false;
		var poll = setInterval(function() {
			hideAddressBar();
			// if (orientationOk) {
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
				if (h == min && increased && fontsLoaded || +new Date() - now > 5000 || !canHideAddressBar && fontsLoaded) {
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
			// }
		}, 50);
	}
}
