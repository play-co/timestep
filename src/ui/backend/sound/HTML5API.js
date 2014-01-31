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

// An API for playing named sounds. Sounds can be given a single file source
// or multiple sources which will be chosen at random at play time. Sounds may
// also be given a default volume and loop boolean.
//
// Only one background sound can be played at a time. They are streamed, not
// preloaded, on native.

import event.Emitter as Emitter;
import util.path;
import device;

// "Extend" the local instance of Audio objects.
var RawAudio = Class(function () {
	this.init = function () {
		var audio = new Audio();

		// we can't really extend an HTML5 audio object in a browser, so
		// do our best...
		var proto = RawAudio.prototype;
		for (var i in proto) {
			if (!audio[i] && proto.hasOwnProperty(i)) {
				audio[i] = RawAudio.prototype[i];
			}
		}

		var playTimeout;

		audio.oldPlay = audio.play;
		audio.play = function() {
			if (audio.readyState == 4) {
				audio.oldPlay();
			} else {
				playTimeout = setTimeout(audio.play, 32);
			}
		};

		audio.oldPause = audio.pause;
		audio.pause = function() {
			if (playTimeout) {
				clearTimeout(playTimeout);	
				playTimeout = undefined;
			}

			audio.oldPause();
		}

		// Hook into accessibility features.
		GLOBAL.ACCESSIBILITY.subscribe('MuteChange', this, function () {
			audio.muted = GLOBAL.ACCESSIBILITY.muted;
		});

		audio.muted = GLOBAL.ACCESSIBILITY.muted;

		return audio;
	};

	// add a stop method that resets the current time
	this.stop = function () {
		try {
			// html5 Audio object
			if (!this.paused) { this.pause(); }

			// if we have the NETWORK_LOADING flag, only restart currentTime if the sound has loaded.
			// http://scottdowne.wordpress.com/2010/08/17/no-more-exceptions/
			if ((!('NETWORK_LOADING' in this)
					|| this.networkState != this.NETWORK_LOADING
					|| this.networkState != this.NETWORK_NO_SOURCE)
					&& !isNaN(this.duration)) {
				this.currentTime = 0;
			}
		} catch (e) {}
	};
});

/**
 * A sound object that can play one of a collection of audio sources.
 */
var MultiSound = Class(function () {
	this.init = function (soundManager, name, opts) {
		this._soundManager = soundManager;
		this._name = name;

		// if a list of file names is given in sources, load them as alternative
		// clips for this sound. Else, assume the only clip for this sound
		// is the file with its same name
		opts = typeof opts == 'string' ? {sources: [opts]} : (opts || {});
		var srcList = opts.sources || [name];
		var sources = this._sources = [];

		var basePath = soundManager.getPath();
		var ext = soundManager.getExt();
		var extTestExp = new RegExp(ext + '$', 'i');

		var loop = opts.loop !== undefined ? opts.loop : opts.background;
		var volume = opts.volume !== undefined ? opts.volume : 1.0;

		var isPaused = bind(this, 'isPaused');

		// html5 hack for web browsers
		var _checkPauseOnPlay = function (src) {
				this.removeEventListener(arguments.callee);
				if (isPaused()) {
					this.pause();
				}
			};

		for (var i = 0, src; src = srcList[i]; ++i) {

			// file paths are relative to the base path
			var fullPath = util.path.join(basePath, opts.path, src);

			// append the extension if not already provided
			if (!extTestExp.test(fullPath)) {
				fullPath += ext;
			}

			var audio = new RawAudio();
			audio.loop = loop;
			audio.volume = volume;
			audio.isBackgroundMusic = opts.background;
			audio.src = fullPath;
			audio.preload = ((audio.readyState != 4) || (soundManager._preload && !opts.background)) ? "auto" : "none";

			// If you pause or mute an html5 audio object in the browser
			// before the sound is ready, it will play anyway.  Here, we
			// check the pause status when the audio starts playing.
			if (audio.addEventListener) {
				audio.addEventListener('playing', _checkPauseOnPlay);
			}

			sources.push(audio);
			if (audio.isBackgroundMusic && window.NATIVE) {
				NATIVE.sound.registerMusic(fullPath, audio);
			}
		}

		this.loop = loop;
		this.isBackgroundMusic = opts.background;
	};

	this.setVolume = function (volume) {
		for (var i = 0, src; src = this._sources[i]; ++i) {
			src.volume = volume;
		}
	};

	this.stop = function () {
		for (var i = 0, src; src = this._sources[i]; ++i) {
			src.stop();
		}
	};

	this.pause = function () {
		this._isPaused = true;

		for (var i = 0, src; src = this._sources[i]; ++i) {
			src.pause();
		}
	};

	this.isPaused = function () {
		return this._isPaused;
	};

	this.isPlaying = function () {
		var isPlaying = false;
		if (this._lastSrc) {
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
		return this._lastSrc ? this._lastSrc.currentTime : 0;
	};

	this.setTime = function (t) {
		if (this._lastSrc && this.isBackgroundMusic && t != undefined) {
			if (this._lastSrc.duration) {
				this._lastSrc.currentTime = t;
			} else {
				setTimeout(bind(this, 'setTime', t + 0.01), 10);
			}
		}
	};

	this.play = function (opts) {
		opts = opts || {};
		if (!this._isPaused) {
			this.stop();
		} else {
			this._isPaused = false;
		}

		var src = this._getRandom();
		src.loop = opts.loop || this.loop;
		src.play();
		
		if (src.muted) {
			// Chrome bug? Audio objects with muted set before they
			// are played won't be muted, so toggle the mute state
			// twice after calling play.
			src.muted = false;
			src.muted = true;
		}
		this._lastSrc = src;
		this.setTime(opts.time);
		if (opts.duration) {
			setTimeout(bind(this, function () {
				this.pause();
			}), opts.duration * 1000);
		}
	};

	this._getRandom = function () {
		var index = Math.random() * this._sources.length | 0;
		return this._sources[index];
	};
});

/**
 * @extends event.Emitter
 */
exports = Class(Emitter, function (supr) {
	this.init = function (opts) {
		opts = opts || {};

		supr(this, 'init', [opts]);

		this.setPath(opts.path);

		//opts.map is deprecated in favor of opts.files
		this._map = opts.files || opts.map;
		this._preload = opts.preload;
		this._sounds = {};
		this._isMusicMuted = false;
		this._areEffectsMuted = false;
		this._currentMusic = null;

		if (opts.persist) {
			this.persistState(opts.persist);
		}

		// determine whether browser supports mp3 or ogg. Default to mp3 if
		// both are supported. Native will return true for everything, but
		// on native, we store ogg files as .mp3 files, so return .mp3...
		var sound = new Audio();
		this._ext = sound.canPlayType("audio/mpeg") ? '.mp3'
			: sound.canPlayType("audio/ogg") ? '.ogg' : '';

		if (!this._ext) {
			this._ext = '.mp3';
			logger.log('warning: could not determine sound support type');
		}

		// add sounds to the audio API's list of sounds and
		// preload them if appropriate
		for (var key in this._map) {
			var item = this._map[key];
			this.addSound(key, item);
		}
	};

	this.getExt = function () { return this._ext; };

	this.getPath = function (name) {
		return (name) ? this._sounds[name].path : this._path;
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
		if (value) { try { value = JSON.parse(value); } catch (e) {} }
		if (value) {
			logger.log('restoring audio api state');
			this.setMusicMuted(value.isMusicMuted);
			this.setEffectsMuted(value.areEffectsMuted);
		}
	};

	/* @internal for now
	 */
	this._persist = function () {
		if (this._key) {
			localStorage.setItem(this._key, JSON.stringify({
					isMusicMuted: this._isMusicMuted,
					areEffectsMuted: this._areEffectsMuted
				}));
		}
	};

	this.getMuted = function () { return this._isMusicMuted && this._areEffectsMuted; };
	this.getMusicMuted = function () { return this._isMusicMuted; };
	this.getEffectsMuted = function () { return this._areEffectsMuted; };

	// global mute
	this.setMuted = function (isMuted) {
		this.setMusicMuted(isMuted);
		this.setEffectsMuted(isMuted);
	};

	this.setMusicMuted = function (isMusicMuted) {
		// if (isMusicMuted == this._isMusicMuted) { return; }
		this._isMusicMuted = isMusicMuted;
		this._persist();

		// resume music on unmute
		if (this._currentMusic) {
			if (isMusicMuted) {
				this._currentMusic.pause();
			} else {
				this._currentMusic.play();
			}
		}
	};

	this.setEffectsMuted = function (areEffectsMuted) {
		if (areEffectsMuted == this._areEffectsMuted) { return; }
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

	this.setVolume = function (name, volume) {
		var sound = this._sounds[name];
		if (sound) {
			sound.setVolume(volume);
			return true;
		}

		return false;
	};

	this.getVolume = function (name) {
		var sound = this._sounds[name];
		if (sound) {
			var elem = sound._sources[0]; //first audio element
			return Math.round(10 * elem.volume) / 10; //round to nearest tenth
		} else {
			return null;
		}
	};

	this.setTime = function (name, t) {
		var sound = this._sounds[name];
		if (!sound) {
			logger.log("warning: no sound of that name");
			return false;
		}

		sound.setTime(t);
	};

	this.getTime = function (name) {
		var sound = this._sounds[name];
		if (!sound) {
			logger.log("warning: no sound of that name");
			return false;
		}

		return sound.getTime();
	};

	this.getDuration = function (name) {
		var sound = this._sounds[name];
		if (!sound) {
			logger.log("warning: no sound of that name");
			return false;
		}

		return sound.getDuration();
	};

	this.play = function (name, opts) {
		var sound = this._sounds[name];
		opts = opts || {};
		if (!sound) {
			logger.log("warning: no sound of that name");
			return false;
		}

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
		var sound = this._sounds[name];
		if (!sound) { return false; }

		// if we're muted and we pause the current music,
		// don't resume the music on unmute.
		if (this._currentMusic == sound) {
			this._currentMusic = null;
		}

		sound.pause();

		return true;
	};

	this.stop = function (name) {
		var sound = this._sounds[name];
		if (!sound) { return false; }

		// if we're muted and we pause the current music,
		// don't resume the music on unmute.
		if (this._currentMusic == sound) {
			this._currentMusic = null;
		}

		sound.stop();

		return true;
	};

	this.isPaused = function (name) {
		var sound = this._sounds[name];
		if (!sound) {
			logger.log("warning: no sound of that name");
			return false;
		}

		return sound.isPaused();
	};

	this.isPlaying = function (name) {
		var sound = this._sounds[name];
		if (!sound) {
			logger.log("warning: no sound of that name");
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
