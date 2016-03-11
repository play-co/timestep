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
 * @class ui.BlendEngine;
 *
 * same API as ui.ParticleEngine
 * except it blends Images together on a single canvas
 */

import device;
import ui.View as View;
import ui.resource.Image as Image;
import performance;
import userAgent;
var Canvas = device.get("Canvas");

// Math references
var sin = Math.sin;
var cos = Math.cos;
var max = Math.max;
var min = Math.min;
var MIN_VALUE = -Number.MAX_VALUE;
var MAX_VALUE = Number.MAX_VALUE;

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
  compositeOperation: "lighter",
  transition: TRANSITION_LINEAR,
  onStart: null,
  onDeath: null,
  triggers: null, // NOT ok to use array here, assign later
  absX: 0,
  absY: 0,
  absW: 1,
  absH: 1
};

var PARTICLE_KEYS = Object.keys(PARTICLE_DEFAULTS);

var MAX_TEX_WIDTH = 1024;
var MAX_TEX_HEIGHT = 1024;



/**
 * @extends ui.View, same API as ui.ParticleEngine.js
 */
exports = Class(View, function () {
  var superProto = View.prototype;

  this.init = function (opts) {
    opts = opts || {};
    // blend engines don't allow input events
    opts.canHandleEvents = false;
    opts.blockEvents = true;
    superProto.init.call(this, opts);

    // particle data array passed to user
    this._particleDataArray = [];

    // particle data object arrays
    this._freeParticleObjects = [];
    this._activeParticleObjects = [];

    // forced centers used when max texture sizes exceeded
    this._forceCenterX = opts.forceCenterX;
    this._forceCenterY = opts.forceCenterY;

    // canvas for blending
    this._canvX = 0;
    this._canvY = 0;
    this._canvW = 1;
    this._canvH = 1;
    this._canvas = new Canvas({ width: MAX_TEX_WIDTH, height: MAX_TEX_HEIGHT, useWebGL: true });
  };

  this.obtainParticleArray = function (count, opts) {
    var isBrowser = (userAgent.APP_RUNTIME === 'browser');
    var isMobile = (userAgent.DEVICE_TYPE === 'mobile');
    var isSimulator = userAgent.SIMULATED;
   
    opts = opts || {};

    // TODO: disable blend engine on mobile browsers until the performance is improved
    count = (opts.performanceScore && isBrowser && isMobile && !isSimulator)
      ? 0
      : performance.getAdjustedParticleCount(count, opts.performanceScore, opts.allowReduction);

    for (var i = 0; i < count; i++) {
      // duplicate copy of default properties for optimal performance
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
        compositeOperation: "lighter",
        transition: TRANSITION_LINEAR,
        onStart: null,
        onDeath: null,
        triggers: [], // OK to use an array here
        absX: 0,
        absY: 0,
        absW: 1,
        absH: 1
      });
    }
    return this._particleDataArray;
  };

  this._cleanObject = function (obj) {
    for (var i = 0, len = PARTICLE_KEYS.length; i < len; i++) {
      var key = PARTICLE_KEYS[i];
      obj[key] = PARTICLE_DEFAULTS[key];
    }
    obj.triggers = []; // don't keep an array in the PARTICLE_DEFAULTS object
    return obj;
  };

  this.emitParticles = function (particleDataArray) {
    var count = particleDataArray.length;
    var active = this._activeParticleObjects;
    for (var i = 0; i < count; i++) {
      var data = particleDataArray[i];
      var img = imageCache[data.image];
      if (!img) {
        img = imageCache[data.image] = new Image({ url: data.image });
      }

      // Inverse scale will be calculated incorrectly for non-sprited images that haven't previously
      // been loaded.  We detect those here and redo the calculation.
      var needsInverseScale = ((img._invScaleX === undefined) || (img._invScaleY === undefined) ||
        (img._invScaleX < 0) || (img._invScaleY < 0));
      if (needsInverseScale) {
        img._invScaleX = 1 / (img._map.marginLeft + img._map.width + img._map.marginRight);
        img._invScaleY = 1 / (img._map.marginTop + img._map.height + img._map.marginBottom);
      }

      if (!data.delay) {
        data.onStart && data.onStart(data);
      } else if (data.delay < 0) {
        throw new Error("Particles cannot have negative delay values!");
      }

      if (data.ttl < 0) {
        throw new Error("Particles cannot have negative time-to-live values!");
      }

      active.push(data);
    }
    particleDataArray.length = 0;
  };

  this._killParticle = function (index) {
    var data = this._activeParticleObjects.splice(index, 1)[0];
    data.onDeath && data.onDeath(data);
    this._freeParticleObjects.push(this._cleanObject(data));
  };

  this.killAllParticles = function () {
    // protect against canvas context clear before native texture is ready
    if (this._activeParticleObjects.length) {
      while (this._activeParticleObjects.length) {
        this._killParticle(0);
      }
      this._canvX = 0;
      this._canvY = 0;
      this._canvW = 1;
      this._canvH = 1;
      this._canvas.getContext("2D").clear();
    }
  };

  this.runTick = function (dt) {
    var active = this._activeParticleObjects;
    var free = this._freeParticleObjects;
    var i = 0;
    var minX = MAX_VALUE;
    var minY = MAX_VALUE;
    var maxX = MIN_VALUE;
    var maxY = MIN_VALUE;
    var shouldUpdate = false;
    while (i < active.length) {
      var data = active[i];
      shouldUpdate = true;

      // handle particle delays
      if (data.delay > 0) {
        data.delay -= dt;
        if (data.delay <= 0) {
          data.onStart && data.onStart(particle);
        } else {
          i++;
          continue;
        }
      }

      // is it dead yet?
      data.elapsed += dt;
      if (data.elapsed >= data.ttl) {
        this._killParticle(i);
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
        data.x = data.ox + data.radius * cos(data.theta);
        data.y = data.oy + data.radius * sin(data.theta);
      } else {
        // cartesian by default
        data.x += pct * data.dx;
        data.y += pct * data.dy;
        data.dx += pct * data.ddx;
        data.dy += pct * data.ddy;
      }

      // anchor translation
      data.anchorX += pct * data.danchorX;
      data.anchorY += pct * data.danchorY;
      data.danchorX += pct * data.ddanchorX;
      data.danchorY += pct * data.ddanchorY;

      // stretching
      data.width += pct * data.dwidth;
      data.height += pct * data.dheight;
      data.dwidth += pct * data.ddwidth;
      data.dheight += pct * data.ddheight;

      // rotation
      data.r += pct * data.dr;
      data.dr += pct * data.ddr;

      // scaling
      data.scale = max(0, data.scale + pct * data.dscale);
      data.scaleX = max(0, data.scaleX + pct * data.dscaleX);
      data.scaleY = max(0, data.scaleY + pct * data.dscaleY);
      data.dscale += pct * data.ddscale;
      data.dscaleX += pct * data.ddscaleX;
      data.dscaleY += pct * data.ddscaleY;

      // opacity
      data.opacity = max(0, min(1, data.opacity + pct * data.dopacity));
      data.dopacity += pct * data.ddopacity;

      // triggers
      var index = 0;
      var triggers = data.triggers;
      while (index < triggers.length) {
        var trig = triggers[index];
        if (trig.smaller && data[trig.property] < trig.value) {
          trig.action(data);
          if (trig.count) {
            trig.count -= 1;
            if (trig.count <= 0) {
              triggers.splice(index, 1);
              index -= 1;
            }
          }
        } else if (!trig.smaller && data[trig.property] > trig.value) {
          trig.action(data);
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

      // establish absolute bounds
      var absX = data.absX = data.x + data.anchorX * (1 - data.scale * data.scaleX);
      var absY = data.absY = data.y + data.anchorY * (1 - data.scale * data.scaleY);
      var absW = data.absW = data.width * data.scale * data.scaleX;
      var absH = data.absH = data.height * data.scale * data.scaleY;
      if (absX < minX) { minX = absX; }
      if (absY < minY) { minY = absY; }
      if (absX + absW > maxX) { maxX = absX + absW; }
      if (absY + absH > maxY) { maxY = absY + absH; }
      i += 1;
    }

    // establish canvas size and position, bounded by max texture size
    if (shouldUpdate) {
      if (minX > maxX) {
        minX = 0;
        maxX = MAX_TEX_WIDTH;
      }
      if (minY > maxY) {
        minY = 0;
        maxY = MAX_TEX_HEIGHT;
      }
      var canvX = minX;
      var canvY = minY;
      var canvW = maxX - minX;
      var canvH = maxY - minY;
      if (canvW > MAX_TEX_WIDTH) {
        var cx = this._forceCenterX !== void 0 ? this._forceCenterX : canvX + canvW / 2;
        canvX = cx - MAX_TEX_WIDTH / 2;
        canvW = MAX_TEX_WIDTH;
      }
      if (canvH > MAX_TEX_HEIGHT) {
        var cy = this._forceCenterY !== void 0 ? this._forceCenterY : canvY + canvH / 2;
        canvY = cy - MAX_TEX_HEIGHT / 2;
        canvH = MAX_TEX_HEIGHT;
      }

      // render our particle images to the canvas's context
      var ctx = this._canvas.getContext("2D");
      ctx.clear();

      var _ctx = ctx._ctx || ctx;
      for (var i = 0, len = active.length; i < len; i++) {
        var data = active[i];
        _ctx.save();

        // context rotation
        if (data.r !== 0) {
          ctx.translate(data.x + data.anchorX - canvX, data.y + data.anchorY - canvY);
          ctx.rotate(data.r);
          ctx.translate(-data.x - data.anchorX + canvX, -data.y - data.anchorY + canvY);
        }

        // context opacity
        if (data.opacity !== 1) {
          ctx.globalAlpha *= data.opacity;
        }

        ctx.globalCompositeOperation = data.compositeOperation;

        var img = imageCache[data.image];
        var map = img.getMap();
        var destX = data.absX - canvX;
        var destY = data.absY - canvY;
        var destW = data.absW;
        var destH = data.absH;
        var scaleX = destW * img._invScaleX;
        var scaleY = destH * img._invScaleY;
        if (map.width > 0 && map.height > 0) {
          ctx.drawImage(img._srcImg,
            map.x, map.y, map.width, map.height,
            destX + scaleX * map.marginLeft,
            destY + scaleY * map.marginTop,
            scaleX * map.width,
            scaleY * map.height);
        }

        _ctx.restore();
      }

      // update our current canvas rendering size and position
      this._canvX = canvX;
      this._canvY = canvY;
      this._canvW = canvW;
      this._canvH = canvH;
    }
  };

  this.render = function (ctx) {
    ctx.drawImage(this._canvas, 0, 0, this._canvW, this._canvH, this._canvX, this._canvY, this._canvW, this._canvH);
  };

  this.getActiveParticles = function () {
    return this._activeParticleObjects;
  };

  this.forEachActiveParticle = function (fn, ctx) {
    var active = this._activeParticleObjects;
    var f = bind(ctx, fn);
    for (var i = active.length - 1; i >= 0; i--) {
      f(active[i], i);
    }
  };

});
