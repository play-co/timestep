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
 * @class ui.ParticleEngine;
 */

import ui.View as View;
import ui.resource.Image as Image;
import ui.ImageView as ImageView;
import performance;

// Math references
var sin = Math.sin;
var cos = Math.cos;
var min = Math.min;
var max = Math.max;

// class-wide image cache
var imageCache = {};

// animation transtion functions borrowed from animate
var TRANSITION_LINEAR = "linear";
var TRANSITIONS = {
  linear: function (n) { return n; },
  easeIn: function (n) { return n * n; },
  easeInOut: function (n) { return (n *= 2) < 1 ? 0.5 * n * n * n : 0.5 * ((n -= 2) * n * n + 2); },
  easeOut: function (n) { return n * (2 - n); }
};

var PARTICLE_DEFAULTS = {
  x: 0,
  y: 0,
  r: 0,
  anchorX: 0,
  anchorY: 0,
  width: 1,
  height: 1,
  scale: 1,
  dscale: 0,
  ddscale: 0,
  scaleX: 1,
  dscaleX: 0,
  ddscaleX: 0,
  scaleY: 1,
  dscaleY: 0,
  ddscaleY: 0,
  dx: 0,
  dy: 0,
  dr: 0,
  danchorX: 0,
  danchorY: 0,
  ddx: 0,
  ddy: 0,
  ddr: 0,
  ddanchorX: 0,
  ddanchorY: 0,
  dwidth: 0,
  dheight: 0,
  ddwidth: 0,
  ddheight: 0,
  opacity: 1,
  dopacity: 0,
  ddopacity: 0,
  ttl: 1000,
  delay: 0,
  flipX: false,
  flipY: false,
  visible: false,
  polar: false,
  ox: 0,
  oy: 0,
  theta: 0,
  radius: 0,
  dtheta: 0,
  dradius: 0,
  ddtheta: 0,
  ddradius: 0,
  elapsed: 0,
  image: "",
  compositeOperation: null,
  transition: TRANSITION_LINEAR,
  onStart: null,
  onDeath: null,
  external: false,
  triggers: null // NOT ok to use array here, assign later
};

var PARTICLE_KEYS = Object.keys(PARTICLE_DEFAULTS);

/**
 * @extends ui.View
 */
exports = Class(View, function () {
  var superProto = View.prototype;

  /**
   * initCount (integer) initialize particle views and objects
   */
  this.init = function (opts) {
    opts = opts || {};
    // particle engines don't allow input events
    opts.canHandleEvents = false;
    opts.blockEvents = true;
    superProto.init.call(this, opts);

    // particle view constructor
    this._ctor = opts.ctor || ImageView;

    // container array for particle objects about to be emitted
    this._particleDataArray = [];

    // recycled particle data objects
    this._freeParticleObjects = [];

    // recycled and active particle views
    this._freeParticles = [];
    this._activeParticles = [];

    // pre-initialization
    var initCount = opts.initCount;
    initCount && this._initParticlePool(initCount);
    this._logViewCreation = initCount > 0;
  };

  /**
   * internal use only
   * initialize particle views and objects
   *
   * count (integer)
   */
  this._initParticlePool = function (count) {
    for (var i = 0; i < count; i++) {
      // initialize particle views
      this._freeParticles.push(new this._ctor({
        superview: this,
        visible: false,
        canHandleEvents: false
      }));
      // initialize particle objects with default properties
      // duplicate of default properties for optimal performance
      this._freeParticleObjects.push({
        x: 0,
        y: 0,
        r: 0,
        anchorX: 0,
        anchorY: 0,
        width: 1,
        height: 1,
        scale: 1,
        dscale: 0,
        ddscale: 0,
        scaleX: 1,
        dscaleX: 0,
        ddscaleX: 0,
        scaleY: 1,
        dscaleY: 0,
        ddscaleY: 0,
        dx: 0,
        dy: 0,
        dr: 0,
        danchorX: 0,
        danchorY: 0,
        ddx: 0,
        ddy: 0,
        ddr: 0,
        ddanchorX: 0,
        ddanchorY: 0,
        dwidth: 0,
        dheight: 0,
        ddwidth: 0,
        ddheight: 0,
        opacity: 1,
        dopacity: 0,
        ddopacity: 0,
        ttl: 1000,
        delay: 0,
        flipX: false,
        flipY: false,
        visible: false,
        polar: false,
        ox: 0,
        oy: 0,
        theta: 0,
        radius: 0,
        dtheta: 0,
        dradius: 0,
        ddtheta: 0,
        ddradius: 0,
        elapsed: 0,
        image: "",
        compositeOperation: null,
        transition: TRANSITION_LINEAR,
        onStart: null,
        onDeath: null,
        external: false,
        triggers: [] // OK to use an array here
      });
    }
  };

  /**
   * returns an array populated with n particle objects
   * modify each particle object, then pass the array in via this.emitParticles
   */
  this.obtainParticleArray = function (count, opts) {
    opts = opts || {};
    
    count = performance.getAdjustedParticleCount(count, opts.performanceScore, opts.allowReduction);

    for (var i = 0; i < count; i++) {
      // duplicate of default properties for optimal performance
      this._particleDataArray.push(this._freeParticleObjects.pop() || {
        x: 0,
        y: 0,
        r: 0,
        anchorX: 0,
        anchorY: 0,
        width: 1,
        height: 1,
        scale: 1,
        dscale: 0,
        ddscale: 0,
        scaleX: 1,
        dscaleX: 0,
        ddscaleX: 0,
        scaleY: 1,
        dscaleY: 0,
        ddscaleY: 0,
        dx: 0,
        dy: 0,
        dr: 0,
        danchorX: 0,
        danchorY: 0,
        ddx: 0,
        ddy: 0,
        ddr: 0,
        ddanchorX: 0,
        ddanchorY: 0,
        dwidth: 0,
        dheight: 0,
        ddwidth: 0,
        ddheight: 0,
        opacity: 1,
        dopacity: 0,
        ddopacity: 0,
        ttl: 1000,
        delay: 0,
        flipX: false,
        flipY: false,
        visible: false,
        polar: false,
        ox: 0,
        oy: 0,
        theta: 0,
        radius: 0,
        dtheta: 0,
        dradius: 0,
        ddtheta: 0,
        ddradius: 0,
        elapsed: 0,
        image: "",
        compositeOperation: null,
        transition: TRANSITION_LINEAR,
        onStart: null,
        onDeath: null,
        external: false,
        triggers: [] // OK to use an array here
      });
    }
    return this._particleDataArray;
  };

  /**
   * takes a particle object, populates it with defaults, then returns it
   */
  this._cleanObject = function (obj) {
    for (var i = 0, len = PARTICLE_KEYS.length; i < len; i++) {
      var key = PARTICLE_KEYS[i];
      obj[key] = PARTICLE_DEFAULTS[key];
    }
    obj.triggers = []; // don't keep an array in the PARTICLE_DEFAULTS object
    return obj;
  };

  /**
   * treat an external view as if it were a particle (don't recycle it internally)
   */
  this._addExternalParticle = function (particle, data) {
    // kill any particles already controlling this view
    var active = this._activeParticles;
    var index = active.indexOf(particle);
    while (index !== -1) {
      this._killParticle(particle, particle.pData, index);
      index = active.indexOf(particle);
    }
    // now emit the particle
    this._prepareTriggers(data);
    data.external = true;
    particle.pData = data;
    active.push(particle);
  };

  /**
   * takes an array of external views (don't recycle them internally)
   * and an array of particle objects obtained from the engine
   * and animates the views accordingly
   */
  this.addExternalParticles = function (views, data) {
    var count = data.length;
    for (var i = 0; i < count; i++) {
      var obj = data.pop();
      var view = views.pop();
      if (view && obj) {
        this._addExternalParticle(view, obj);
      }
    }
  };

  /**
   * after obtaining the particle array full of particle objects
   * pass the array in here once you set up each objects' properties
   */
  this.emitParticles = function (particleDataArray) {
    var count = particleDataArray.length;
    var active = this._activeParticles;
    var free = this._freeParticles;
    for (var i = 0; i < count; i++) {
      // get particle data object and recycled view if possible
      var data = particleDataArray.pop();
      var particle = free.pop();
      if (!particle) {
        particle = new this._ctor({
          superview: this,
          visible: false,
          canHandleEvents: false
        });
        if (this._logViewCreation) {
          logger.warn(this.getTag(), "created View:", particle.getTag());
        }
      }

      // only set particle image if necessary
      var image = data.image;
      if (particle.setImage && particle.lastImage !== image) {
        var img = imageCache[image];
        if (img === void 0) {
          img = imageCache[image] = new Image({ url: image });
        }
        particle.setImage(img);
        particle.lastImage = image;
      }

      // apply style properties
      var s = particle.style;
      s.x = data.x;
      s.y = data.y;
      s.r = data.r;
      s.anchorX = data.anchorX;
      s.anchorY = data.anchorY;
      s.width = data.width;
      s.height = data.height;
      s.scale = data.scale;
      s.scaleX = data.scaleX;
      s.scaleY = data.scaleY;
      s.opacity = data.opacity;
      s.flipX = data.flipX;
      s.flipY = data.flipY;
      s.compositeOperation = data.compositeOperation;
      s.visible = data.visible;

      // start particles if there's no delay
      if (!data.delay) {
        s.visible = true;
        data.onStart && data.onStart(particle);
      } else if (data.delay < 0) {
        throw new Error("Particles cannot have negative delay values!");
      }

      if (data.ttl < 0) {
        throw new Error("Particles cannot have negative time-to-live values!");
      }

      // and finally emit the particle
      this._prepareTriggers(data);
      particle.pData = data;
      active.push(particle);
    }
  };

  /**
   * internal use only
   * update trigger properties
   *
   * data (object)
   */
  this._prepareTriggers = function (data) {
    var triggers = data.triggers;
    for (var i = 0, len = triggers.length; i < len; i++) {
      var trig = triggers[i];
      trig.isStyle = trig.isStyle !== void 0
        ? trig.isStyle
        : trig.property.charAt(0) !== 'd';
    }
  };

  /**
   * internal use only
   * clean-up a particle
   *
   * particle (this._ctor || ImageView)
   * data (object)
   * index (integer) position in this._activeParticles
   */
  this._killParticle = function (particle, data, index) {
    var active = this._activeParticles;
    var s = particle.style;
    var spliced = active.splice(index, 1);

    particle.pData = null;
    data && data.onDeath && data.onDeath(particle, data);

    // external particles must handle their own clean-up, but we still handle the data object
    if (data && data.external) {
      this._freeParticleObjects.push(this._cleanObject(data));
    } else {
      s.visible = false;
      this._freeParticles.push(spliced[0]);
      data && this._freeParticleObjects.push(this._cleanObject(data));
    }
  };

  /**
   * finish and hide all particles immediately
   */
  this.killAllParticles = function () {
    var active = this._activeParticles;
    while (active.length) {
      var particle = active[0];
      this._killParticle(particle, particle.pData, 0);
    }
  };

  /**
   * step the particle engine forward in time by dt milliseconds
   * this should be called manually from your own tick function
   */
  this.runTick = function (dt) {
    var i = 0;
    var active = this._activeParticles;
    var free = this._freeParticles;
    while (i < active.length) {
      var particle = active[i];
      var s = particle.style;
      var data = particle.pData;

      // failsafe for a heisenbug that arises from mis-use of the engine
      if (!data) {
        // zombie particles must die
        this._killParticle(particle, data, i);
        continue;
      }

      // handle particle delays
      if (data.delay > 0) {
        data.delay -= dt;
        if (data.delay <= 0) {
          s.visible = true;
          data.onStart && data.onStart(particle);
        } else {
          i++;
          continue;
        }
      }

      // is it dead yet?
      data.elapsed += dt;
      if (data.elapsed >= data.ttl) {
        this._killParticle(particle, data, i);
        continue;
      }

      // calculate the percent of one second elapsed; deltas are in units / second
      var pct = dt / 1000;
      if (data.transition !== TRANSITION_LINEAR) {
        var getTransitionProgress = TRANSITIONS[data.transition];
        var prgBefore = getTransitionProgress((data.elapsed - dt) / data.ttl);
        var prgAfter = getTransitionProgress(data.elapsed / data.ttl);
        pct = (prgAfter - prgBefore) * data.ttl / 1000;
      }

      // translation
      if (data.polar) {
        data.radius += pct * data.dradius;
        data.theta += pct * data.dtheta;
        data.dradius += pct * data.ddradius;
        data.dtheta += pct * data.ddtheta;
        // allow cartesian translation of the origin point
        data.ox += pct * data.dx;
        data.oy += pct * data.dy;
        data.dx += pct * data.ddx;
        data.dy += pct * data.ddy;
        // polar position
        s.x = data.x = data.ox + data.radius * cos(data.theta);
        s.y = data.y = data.oy + data.radius * sin(data.theta);
      } else {
        // cartesian by default
        var dx = pct * data.dx;
        if (dx !== 0) { s.x = data.x += dx; }
        var dy = pct * data.dy;
        if (dy !== 0) { s.y = data.y += dy; }
        data.dx += pct * data.ddx;
        data.dy += pct * data.ddy;
      }

      // anchor translation
      var dax = pct * data.danchorX;
      if (dax !== 0) { s.anchorX = data.anchorX += dax; }
      var day = pct * data.danchorY;
      if (day !== 0) { s.anchorY = data.anchorY += day; }
      data.danchorX += pct * data.ddanchorX;
      data.danchorY += pct * data.ddanchorY;

      // stretching
      var dw = pct * data.dwidth;
      if (dw !== 0) { s.width = data.width += dw; }
      var dh = pct * data.dheight;
      if (dh !== 0) { s.height = data.height += dh; }
      data.dwidth += pct * data.ddwidth;
      data.dheight += pct * data.ddheight;

      // rotation
      var dr = pct * data.dr;
      if (dr !== 0) { s.r = data.r += dr; }
      data.dr += pct * data.ddr;

      // scaling
      var ds = pct * data.dscale;
      if (ds !== 0) { s.scale = data.scale = max(0, data.scale + ds); }
      var dsx = pct * data.dscaleX;
      if (dsx !== 0) { s.scaleX = data.scaleX = max(0, data.scaleX + dsx); }
      var dsy = pct * data.dscaleY;
      if (dsy !== 0) { s.scaleY = data.scaleY = max(0, data.scaleY + dsy); }
      data.dscale += pct * data.ddscale;
      data.dscaleX += pct * data.ddscaleX;
      data.dscaleY += pct * data.ddscaleY;

      // opacity
      var dop = pct * data.dopacity;
      if (dop !== 0) { s.opacity = data.opacity = max(0, min(1, data.opacity + dop)); }
      data.dopacity += pct * data.ddopacity;

      // triggers
      var index = 0;
      var triggers = data.triggers;
      while (index < triggers.length) {
        var trig = triggers[index];
        // where can the property be found, style or data?
        var where = trig.isStyle ? s : data;
        if (trig.smaller && where[trig.property] < trig.value) {
          trig.action(particle);
          if (trig.count) {
            trig.count -= 1;
            if (trig.count <= 0) {
              triggers.splice(index, 1);
              index -= 1;
            }
          }
        } else if (!trig.smaller && where[trig.property] > trig.value) {
          trig.action(particle);
          if (trig.count) {
            trig.count -= 1;
            if (trig.count <= 0) {
              triggers.splice(index, 1);
              index -= 1;
            }
          }
        }
        index += 1;
      }
      i += 1;
    }
  };

  /**
   * public accessor for particle views (object data attached to each as pData)
   */
  this.getActiveParticles = function () {
    return this._activeParticles;
  };

  /**
   * fn (function) called for each active particle view, takes params: view, index
   *
   * ctx (object) the context on which fn should be called
   *
   * like Array.forEach, call a function for each active particle view
   */
  this.forEachActiveParticle = function (fn, ctx) {
    var views = this._activeParticles;
    for (var i = views.length - 1; i >= 0; i--) {
      fn.call(ctx, views[i], i);
    }
  };

});
