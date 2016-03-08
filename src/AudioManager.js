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

/**
* @class AudioManager;
* Implements platform-aware Audio support.
*
* @doc http://doc.gameclosure.com/api/sound.html
* @docsrc https://github.com/gameclosure/doc/blob/master/api/sound.md
*/

import device;
import util.path;
import event.Emitter as Emitter;
import ui.backend.sound.AudioLoader as AudioLoader;

// An API for playing named sounds. Sounds can be given a single file source
// or multiple sources which will be chosen at random at play time. Sounds may
// also be given a default volume and loop boolean.
//
// Only one background sound can be played at a time. They are streamed, not
// preloaded, on native.

// define AudioContext as best as possible; it may not exist
var AudioContext = window.AudioContext || window.webkitAudioContext;

// global private variables
var _ctx = null;

// use an AudioContext if available, otherwise fallback to Audio
if (AudioContext) {
  try {
    _ctx = new AudioContext();
  } catch (e) {
    // most commonly due to hardware limits on AudioContext instances
    logger.warn("HTML5 AudioContext init failed, falling back to Audio!");
  }
} else {
  logger.warn("HTML5 AudioContext not supported, falling back to Audio!");
}

var _muteAll = false;
var _registeredAudioManagers = [];

/**
* RawAudio Class
*
* Extend the local instance of Audio objects.
* Created and used by MultiSound Class.
*/
var RawAudio = Class(function () {
  this.init = function () {
    if (typeof Audio === "undefined") {
      return null;
    }

    // we can't extend an HTML5 audio object in a browser, so do our best
    var audio = new Audio();
    var proto = RawAudio.prototype;
    for (var i in proto) {
      if (!audio[i] && proto.hasOwnProperty(i)) {
        audio[i] = proto[i];
      }
    }

    var playTimeout = null;
    audio.oldPlay = audio.play;
    audio.play = function() {
      if (audio.readyState === 4) {
        audio.oldPlay();
      } else {
        playTimeout = setTimeout(audio.play, 32);
      }
    };
    audio.oldPause = audio.pause;
    audio.pause = function() {
      if (playTimeout !== null) {
        clearTimeout(playTimeout);
        playTimeout = null;
      }
      audio.oldPause();
    };

    return audio;
  };

  // add a stop method that resets the current time
  this.stop = function () {
    !this.paused && this.pause();
    if ((this.NETWORK_LOADING === undefined
      || this.networkState !== this.NETWORK_LOADING
      || this.networkState !== this.NETWORK_NO_SOURCE)
        && !isNaN(this.duration))
    {
      this.currentTime = 0;
    }
  };
});

/**
* MultiSound Class
*
* A sound object that can play one of a collection of audio sources.
* Created and used by exported AudioManager Class.
*/
var MultiSound = Class(function () {
  this.init = function (soundManager, name, opts) {
    opts = typeof opts === 'string' ? { sources: [opts] } : (opts || {});

    this._soundManager = soundManager;
    this._name = name;
    this._isPaused = false;
    this._lastSrc = null;
    this._sources = [];
    this._paths = [];

    this._useAudioContext = false;
    this._loader = null;
    this._gainNode = null;

    this.loop = opts.loop !== undefined ? opts.loop : opts.background;
    this.isBackgroundMusic = opts.background;

    // if a list of file names is given in sources, load them as alternative
    // clips for this sound. Else, assume the only clip for this sound
    // is the file with its same name
    var srcList = opts.sources || [name];
    var sources = this._sources;
    var paths = this._paths;
    var basePath = soundManager.getPath();
    var ext = soundManager.getExt();
    var extTestExp = new RegExp(ext + '$', 'i');
    var loop = this.loop;
    var volume = opts.volume !== undefined ? opts.volume : 1;

    // HTML5 hack for browsers
    var isPaused = bind(this, 'isPaused');
    var _checkPauseOnPlay = function (src) {
      this.removeEventListener(arguments.callee);
      isPaused() && this.pause();
    };

    if (_ctx) {
      this._useAudioContext = true;
      this._loader = soundManager.getAudioLoader();
      this._gainNode = _ctx.createGain();
      this._gainNode.connect(_ctx.destination);
      this._gainNode.gain.value = volume;
    }

    for (var i = 0, src; src = srcList[i]; ++i) {
      // file paths are relative to the base path
      var fullPath = util.path.join(basePath, opts.path, src);
      // append the extension if not already provided
      if (!extTestExp.test(fullPath)) {
        fullPath += ext;
      }
      paths.push(fullPath);

      // prefer AudioContext over Audio
      if (!this._useAudioContext) {
        var audio = new RawAudio();
        if (audio) {
          audio.loop = loop;
          audio.volume = volume;
          audio.isBackgroundMusic = opts.background;
          audio.src = fullPath;
          audio.preload = ((audio.readyState !== 4) || (soundManager._preload && !opts.background)) ? "auto" : "none";

          // If you pause or mute an html5 audio object in the browser
          // before the sound is ready, it will play anyway.  Here, we
          // check the pause status when the audio starts playing.
          if (audio.addEventListener) {
            audio.addEventListener('playing', _checkPauseOnPlay);
          }

          sources.push(audio);
          if (audio.isBackgroundMusic && NATIVE && NATIVE.sound) {
            NATIVE.sound.registerMusic(fullPath, audio);
          }
        }
      }
    }
  };

  this.getVolume = function () {
    if (this._useAudioContext) {
      return this._gainNode.gain.value;
    } else {
      var src = this._sources[0];
      return (src && src.volume) || 0;
    }
  };

  this.setVolume = function (volume) {
    if (this._useAudioContext) {
      this._gainNode.gain.value = volume;
    } else {
      for (var i = 0, src; src = this._sources[i]; ++i) {
        src.volume = volume;
      }
    }
  };

  this.stop = function () {
    if (this._useAudioContext) {
      this._lastSrc && this._lastSrc.stop(0);
      this._lastSrc = null;
    } else {
      for (var i = 0, src; src = this._sources[i]; ++i) {
        src.stop();
      }
    }
  };

  this.pause = function () {
    this._isPaused = true;
    if (this._useAudioContext) {
      this.stop();
    } else {
      for (var i = 0, src; src = this._sources[i]; ++i) {
        src.pause();
      }
    }
  };

  this.isPaused = function () {
    return this._isPaused;
  };

  this.isPlaying = function () {
    var isPlaying = false;
    if (!this._useAudioContext && this._lastSrc !== null) {
      var cur = this._lastSrc.currentTime;
      var dur = this._lastSrc.duration;
      // NaN duration means the duration isn't loaded yet,
      // meaning the sound was started very recently. Since
      // this._lastSrc is defined, we know that the sound has
      // been played, so it's playing unless it's paused :)
      if (isNaN(dur) || cur < dur) {
        isPlaying = !this.isPaused();
      }
    }
    return isPlaying;
  };

  this.getDuration = function () {
    return this._lastSrc && this._lastSrc.duration || 0;
  };

  this.getTime = function () {
    return this._lastSrc && this._lastSrc.currentTime || 0;
  };

  this.setTime = function (t) {
    if (!this._useAudioContext && this._lastSrc && this.isBackgroundMusic) {
      if (this._lastSrc.duration) {
        this._lastSrc.currentTime = t;
      } else {
        //setTimeout(bind(this, 'setTime', t + 0.01), 10);
      }
    }
  };

  this.play = function (opts) {
    opts = opts || {};
    var loop = opts.loop || this.loop;
    var time = opts.time || 0;
    var duration = opts.duration ? opts.duration * 1000 : undefined;

    if (this._useAudioContext) {
      var loader = this._loader;
      var index = Math.random() * this._paths.length | 0;
      var path = this._paths[index];
      var buffer = loader.getBuffer(path);
      if (!buffer) {
        loader.doOnLoad(path, bind(this, function (buffers) {
          if (!this._isPaused) {
            this._playFromBuffer(buffers[0], loop, time, duration);
          }
        }));
      } else {
        this._playFromBuffer(buffer, loop, time, duration);
      }
    } else {
      var src = this._getRandom();
      src.play();
      if (src.muted) {
        // Chrome bug? Audio objects with muted set before they
        // are played won't be muted, so toggle the mute state
        // twice after calling play.
        src.muted = false;
        src.muted = true;
      }
      this.setTime(time);
      if (duration !== undefined) {
        setTimeout(bind(this, 'pause'), duration);
      }
      this._lastSrc = src;
    }
    this._isPaused = false;
  };

  this._playFromBuffer = function (buffer, loop, time, duration) {
    if (buffer) {
      var src = _ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = loop;
      src.connect(this._gainNode);
      if (duration !== undefined) {
        src.start(_ctx.currentTime, time, duration);
      } else {
        src.start(_ctx.currentTime, time);
      }
      this._lastSrc = src;
    }
  };

  this._getRandom = function () {
    var index = Math.random() * this._sources.length | 0;
    return this._sources[index];
  };
});

/**
* AudioManager Class
*
* @extends event.Emitter
*/
exports = Class(Emitter, function (supr) {
  this.init = function (opts) {
    opts = opts || {};
    supr(this, 'init', arguments);

    this._loader = null;
    this.setPath(opts.path);
    this._map = opts.files || opts.map;
    this._preload = opts.preload;
    this._sounds = {};
    this._isMusicMuted = false;
    this._areEffectsMuted = false;
    this._currentMusic = null;
    this._key = "";

    // register instances of AudioManager for global app mute
    this.setMuted(_muteAll);
    _registeredAudioManagers.push(this);

    opts.persist && this.persistState(opts.persist);

    // pass the global AudioContext instance to AudioLoaders
    _ctx && this.setAudioContext();

    // determine whether browser supports mp3 or ogg. Default to mp3 if
    // both are supported. Native will return true for everything, but
    // on native, we store ogg files as .mp3 files, so return .mp3...
    if (typeof Audio !== "undefined") {
      var sound = new Audio();
      if (sound.canPlayType("audio/mpeg")) {
        this._ext = ".mp3";
      } else if (sound.canPlayType("audio/ogg")) {
        this._ext = ".ogg";
      }
    } else {
      logger.warn("HTML5 Audio not supported!");
    }

    if (this._ext === undefined) {
      this._ext = ".mp3";
      logger.warn("Warning: sound support unclear - defaulting to .mp3");
    }

    // add sounds to the audio API's list of sounds and preload them
    for (var key in this._map) {
      var item = this._map[key];
      this.addSound(key, item);
    }

    // AudioContext preloading
    if (_ctx && this._preload) {
      var urls = [];
      for (var key in this._sounds) {
        var sound = this._sounds[key];
        urls = urls.concat(sound._paths);
      }
      this.preloadSounds(urls);
    }
  };

  this.getAudioContext = function () {
    return _ctx;
  };

  this.setAudioContext = function () {
    if (this._loader) {
      this._loader.setAudioContext(_ctx);
    } else {
      this._loader = new AudioLoader({ ctx: _ctx });
    }
  };

  this.getAudioLoader = function () {
    return this._loader;
  };

  this.preloadSounds = function (urls) {
    // used for AudioContext only
    this._loader && this._loader.load(urls);
  };

  this.getExt = function () {
    return this._ext;
  };

  this.getPath = function () {
    return this._path;
  };

  this.setPath = function (path) {
    if (path) {
      path = path.replace(/\/$/, '');
    }
    this._path = path || '';
  };

  this.addSound = function (name, opts) {
    this._sounds[name] = new MultiSound(this, name, opts);
  };

  /* @internal for now
   */
  this.persistState = function (key) {
    this._key = key;

    var value = localStorage.getItem(this._key);
    if (value) {
      try {
        value = JSON.parse(value);
      } catch (e) {}
    }

    if (value) {
      logger.log("Restoring Audio API state!");
      this.setMusicMuted(value.isMusicMuted);
      this.setEffectsMuted(value.areEffectsMuted);
    }
  };

  /* @internal for now
   */
  this._persist = function () {
    if (this._key !== "") {
      localStorage.setItem(this._key, JSON.stringify({
        isMusicMuted: this._isMusicMuted,
        areEffectsMuted: this._areEffectsMuted
      }));
    }
  };

  this.getMuted = function () {
    return this._isMusicMuted && this._areEffectsMuted;
  };

  this.getMusicMuted = function () {
    return this._isMusicMuted;
  };

  this.getEffectsMuted = function () {
    return this._areEffectsMuted;
  };

  this.setMuted = function (isMuted) {
    this.setMusicMuted(isMuted);
    this.setEffectsMuted(isMuted);
  };

  this.setMusicMuted = function (isMusicMuted) {
    if (_muteAll) { isMusicMuted = true; }
    this._isMusicMuted = isMusicMuted;
    this._persist();
    // resume music on unmute
    if (this._currentMusic) {
      this._currentMusic.pause();
      if (!isMusicMuted) {
        this._currentMusic.play();
      }
    }
  };

  this.setEffectsMuted = function (areEffectsMuted) {
    if (_muteAll) { areEffectsMuted = true; }
    this._areEffectsMuted = areEffectsMuted;
    this._persist();
    if (areEffectsMuted) {
      for (var key in this._sounds) {
        var sound = this._sounds[key];
        if (!sound.isBackgroundMusic) {
          sound.stop();
        }
      }
    }
  };

  this.getSound = function(name) {
    var sound = this._sounds[name];
    if (!sound) { logger.warn("Warning: no sound named " + name); }
    return sound;
  };

  this.setVolume = function (name, volume) {
    var sound = this.getSound(name);
    if (sound) {
      sound.setVolume(volume);
      return true;
    }
    return false;
  };

  this.getVolume = function (name) {
    var sound = this.getSound(name);
    if (sound) {
      return sound.getVolume();
    } else {
      return null;
    }
  };

  this.setTime = function (name, t) {
    var sound = this.getSound(name);
    if (!sound) {
      return false;
    }
    sound.setTime(t || 0);
    return true;
  };

  this.getTime = function (name) {
    var sound = this.getSound(name);
    if (!sound) {
      return false;
    }
    return sound.getTime();
  };

  this.getDuration = function (name) {
    var sound = this.getSound(name);
    if (!sound) {
      return false;
    }
    return sound.getDuration();
  };

  this.play = function (name, opts) {
    var sound = this.getSound(name);
    if (!sound) {
      return false;
    }

    opts = opts || {};
    var isBackgroundMusic = sound.isBackgroundMusic;
    if (isBackgroundMusic) {
      // some platforms enforce only one simultaneous background music
      // (native) while others do not.  Enforce it always.
      if (this._currentMusic) {
        this._currentMusic.stop();
      }
      this._currentMusic = sound;
      // if we're muted, make sure to resume the music if we unmute
      if (!this._isMusicMuted) {
        sound.play(opts);
      }
    } else if (!this._areEffectsMuted) {
      sound.play(opts);
    }
    return true;
  };

  this.pause = function (name) {
    var sound = this.getSound(name);
    if (!sound) {
      return false;
    }
    // if muted and we pause current music, don't resume it on unmute
    if (this._currentMusic === sound) {
      this._currentMusic = null;
    }
    sound.pause();
    return true;
  };

  this.stop = function (name) {
    var sound = this.getSound(name);
    if (!sound) {
      return false;
    }
    // if muted and we pause current music, don't resume it on unmute
    if (this._currentMusic === sound) {
      this._currentMusic = null;
    }
    sound.stop();
    return true;
  };

  this.isPaused = function (name) {
    var sound = this.getSound(name);
    if (!sound) {
      return false;
    }
    return sound.isPaused();
  };

  this.isPlaying = function (name) {
    var sound = this.getSound(name);
    if (!sound) {
      return false;
    }
    return sound.isPlaying();
  };

  // @deprecated
  this.playBackgroundMusic = this.play;

  // @deprecated
  this.pauseBackgroundMusic = function () {
    this._currentMusic && this._currentMusic.pause();
  };
});

// expose a global mute function (GC.app.muteAll)
exports.muteAll = function(mute) {
  _muteAll = mute;
  for (var i = 0, len = _registeredAudioManagers.length; i < len; i++) {
    _registeredAudioManagers[i].setMuted(mute);
  }
};
