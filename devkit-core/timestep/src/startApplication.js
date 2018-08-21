import {
  GLOBAL,
  logger,
  CONFIG
} from 'base';

import device from 'device';
import engine from 'ui/engine';
import loader from 'ui/resource/loader';
import FontRenderer from 'platforms/browser/FontRenderer';
import doc from 'platforms/browser/doc';

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

if (!GLOBAL.CONFIG) {
  GLOBAL.CONFIG = {};
}
if (!GLOBAL.DEBUG) {
  GLOBAL.DEBUG = false;
}

var spritesheets;
try {
  if (GLOBAL.CACHE) {
    spritesheets = JSON.parse(GLOBAL.CACHE['spritesheets/map.json']);
  }
} catch (e) {
  logger.warn('spritesheet map failed to parse', e);
}

var soundMap;
try {
  if (GLOBAL.CACHE) {
    soundMap = JSON.parse(GLOBAL.CACHE['resources/sound-map.json']);
  }
} catch (e) {
  logger.warn('sound map failed to parse', e);
}

loader.addSheets(spritesheets);
loader.addAudioMap(soundMap);


jsio.__env.fetch = function (filename) {
  return false;
};

import Promise from 'bluebird';
GLOBAL.Promise = Promise;

var isSimulator = GLOBAL.CONFIG && !!CONFIG.simulator;
if (isSimulator) {
  // prefix filenames in the debugger
  jsio.__env.debugPath = function (path) {
    return 'http://' + (CONFIG.bundleID || CONFIG.packageName) + '/' + path.replace(
      /^[\.\/]+/, '');
  };
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
CONFIG.isMuted = mute !== undefined && mute !== 'false' && mute !== '0' && mute !== 'no';

function startApp (ApplicationCtor)  {
  if (CONFIG.version) {
    logger.log('Version', CONFIG.version);
  }

  ApplicationCtor.prototype.__root = true;

  var app = new ApplicationCtor();
  app.view = app;

  engine.setView(app);
  engine.startLoop();

  // N.B: application needs to be attached to GC before call to initUI
  GC.attachApp(app, engine);

  app.initUI && app.initUI();

  FontRenderer.init();

  window.addEventListener('pageshow', function onShow () {
    app && app.onResume && app.onResume();
  }, false);

  window.addEventListener('pagehide', function onHide () {
    app && app.onPause && app.onPause();
  }, false);

  /// #if IS_DEVELOPMENT
  // Ugly workaround for ifdef-loader being a jerk
  var devtools = require('devtools').default;
  devtools.setApp(app);
  /// #endif
}

export default function startGame (ApplicationCtor) {
  doc.setCanvas(engine.getCanvas());

  // Setup timestep device API
  device.init();

  if (doc.initialized) {
    startApp(ApplicationCtor);
  } else {
    doc.subscribe('initialized', null, () => {
      startApp(ApplicationCtor);
    });
  }
}
