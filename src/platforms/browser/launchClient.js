import {
  GLOBAL,
  CONFIG
} from 'base';

/**
 * @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */
/* globals jsio, CONFIG, DEBUG */
// no dynamic source fetching
jsio.__env.fetch = function (filename) {
  return false;
};

import Promise from 'Promise';
GLOBAL.Promise = Promise;

var isSimulator = GLOBAL.CONFIG && !!CONFIG.simulator;
var isNative = /^native/.test(CONFIG.target);

if (isSimulator) {
  // prefix filenames in the debugger
  jsio.__env.debugPath = function (path) {
    return 'http://' + (CONFIG.bundleID || CONFIG.packageName) + '/' + path.replace(
      /^[\.\/]+/, '');
  };

  if (isNative) {
    require('../debugging/nativeShim');
  }
}

// shims
import stdJSON from 'std/JSON';

if (!window.JSON) {
  stdJSON.createGlobal();
}

if (!window.console) {
  window.console = {};
  window.console.log = window.console.info = window.console.error = window.console
    .warn = function () {};
}

// FIXME: Uncaught TypeError: Cannot assign to read only property 'localStorage' of object '#<Window>''
// if (typeof localStorage !== 'undefined') {
//   /* jshint -W020 */
//   localStorage = {
//     getItem: function () {},
//     setItem: function () {},
//     removeItem: function () {}
//   };
//   /* jshint +W020 */
// }
if (!isSimulator) {
  // start the cache service-worker
  require('./cache');
}

var splash = document.getElementById('_GCSplash');
if (splash) {
  if (!CONFIG.splash.hide) {
    CONFIG.splash.hide = function () {
      // timeout lengths are debateable. Perhaps they could
      // be configurable. On one hand these time out lengths increase
      // the length of time that nothing is happening. However, it also
      // makes the transition into the game much smoother. The initial timeout
      // is for images to pop in.
      setTimeout(function () {
        splash.style.opacity = 0;
        splash.style.pointerEvents = 'none';
        setTimeout(function () {
          splash.parentNode.removeChild(splash);
        }, 500);
      }, 100);
    };
  }
}

// parsing options
import stdUri from 'std/uri';
var uri = new stdUri(window.location);
var mute = uri.hash('mute');
CONFIG.isMuted = mute !== undefined && mute !== 'false' && mute !== '0' && mute !==
  'no';

var simulatorModules;
var ApplicationCtor;

export const startGame = _ApplicationCtor => {
  ApplicationCtor = _ApplicationCtor;
  if (DEBUG && isSimulator && Array.isArray(CONFIG.simulator.modules)) {
    simulatorModules = [];

    // client API inside simulator: call onLaunch() on each simulator module,
    // optionally block on a returned promise for up to 5 seconds
    Promise.map(CONFIG.simulator.modules, function (name) {
      // try {
      //   var module = jsio(name);
      //   if (module) {
      //     simulatorModules.push(module);
      //     if (typeof module.onLaunch == 'function') {
      //       return module.onLaunch();
      //     }
      //   }
      // } catch (e) {
      //   console.warn(e);
      // }
      console.error('TODO: Dynamic require ctx');
    }).timeout(5000).finally(queueStart);
  } else {
    queueStart();
  }
};

function queueStart () {
  /* jshint -W117 */
  if (window.GC_LIVE_EDIT && GC_LIVE_EDIT._isLiveEdit) {
    var intervalId = setInterval(function () {
      if (GC_LIVE_EDIT._liveEditReady) {
        try {
          startApp();
        } catch (err) {
          // In case loading fails, we will still clear the interval
          console.error('Error while starting app', err);
        }
        clearInterval(intervalId);
      }
    }, 100);
  } else {
    startApp();
  }
}

/* jshint +W117 */

import devkit from 'devkit';

function startApp () {
  // setup timestep device API
  const device = require('device').default;
  require('platforms/browser/initialize');
  device.init();

  // init sets up the GC object
  GLOBAL.GC = new devkit.ClientAPI();
  if (simulatorModules) {
    GLOBAL.GC.on('app', function (app) {
      // client API inside simulator: call init() on each simulator module,
      // optionally block on a returned promise for up to 5 seconds
      simulatorModules.forEach(function (module) {
        if (typeof module.onApp == 'function') {
          module.onApp(app);
        }
      });
    });
  }

  GLOBAL.GC.buildApp('launchUI', ApplicationCtor);
}
