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
import { logger } from 'base';

import View from 'ui/View';
import ImageViewCache from 'ui/resource/ImageViewCache';
import Matrix2D from 'platforms/browser/webgl/Matrix2D';
import TRANSITIONS from 'animate/transitions.js';

// animation transtion functions borrowed from animate
var TRANSITION_LINEAR = 'linear';

class ParticleStyle {
  constructor (particle) {
    this.x = 0;
    this.y = 0;
    this._zIndex = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.anchorX = 0;
    this.anchorY = 0;
    this.centerAnchor = false;
    this.width = 0;
    this.height = 0;
    this.r = 0;
    this.opacity = 1;
    this.scale = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.flipX = false;
    this.flipY = false;
    this.visible = true;
    this.compositeOperation = null;

    this._cachedRotation = 0;
    this._cachedSin = 0;
    this._cachedCos = 1;

    this._particle = particle;
  }

  set zIndex (zIndex) {
    if (this._zIndex !== zIndex) {
      this._zIndex = zIndex;
      this._particle._engine._needsSorting = true;
    }
  }

  get zIndex () {
    return this._zIndex;
  }
}

class Particle {
  constructor (engine) {
    this._engine = engine;
    this._image = null;
    this._imageURL = '';
    this.style = new ParticleStyle(this);
    this._filter = null;

    // legacy feature
    this.pData = this;

    this.reset();
  }

  get image () {
    return this._imageURL;
  }

  set image (imageURL) {
    if (imageURL && imageURL !== this._imageURL) {
      this._image = ImageViewCache.getImage(imageURL);
      this._imageURL = imageURL;
      this._engine._loaded = false;
    }
  }

  getFilter () {
    return this._filter;
  }

  setFilter (filter) {
    this._filter = filter;
  }

  removeFilter () {
    this._filter = null;
  }

  reset () {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.r = 0;
    this.anchorX = 0;
    this.anchorY = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.width = 1;
    this.height = 1;
    this.scale = 1;
    this.dscale = 0;
    this.ddscale = 0;
    this.scaleX = 1;
    this.dscaleX = 0;
    this.ddscaleX = 0;
    this.scaleY = 1;
    this.dscaleY = 0;
    this.ddscaleY = 0;
    this.dx = 0;
    this.dy = 0;
    this.dz = 0;
    this.dr = 0;
    this.danchorX = 0;
    this.danchorY = 0;
    this.ddx = 0;
    this.ddy = 0;
    this.ddz = 0;
    this.ddr = 0;
    this.ddanchorX = 0;
    this.ddanchorY = 0;
    this.dwidth = 0;
    this.dheight = 0;
    this.ddwidth = 0;
    this.ddheight = 0;
    this.opacity = 1;
    this.dopacity = 0;
    this.ddopacity = 0;
    this.ttl = 1000;
    this.delay = 0;
    this.flipX = false;
    this.flipY = false;
    this.visible = false;
    this.polar = false;
    this.ox = 0;
    this.oy = 0;
    this.theta = 0;
    this.radius = 0;
    this.dtheta = 0;
    this.dradius = 0;
    this.ddtheta = 0;
    this.ddradius = 0;
    this.elapsed = 0;
    this.compositeOperation = null;
    this.transition = TRANSITION_LINEAR;
    this.onStart = null;
    this.triggers = [];

    return this;
  }
}

var helperVector = {
  x: 0,
  y: 0,
  z: 0
};

/**
 * @extends ui.View
 */
export default class ParticleEngine extends View {
  constructor (opts) {
    opts = opts || {};
    // particle engines don't allow input events
    opts.canHandleEvents = false;
    opts.blockEvents = true;
    super(opts);

    this._isometric = opts.isometric || false;
    this._needsSorting = false;

    // container array for particle objects about to be emitted
    this._particleDataArray = [];

    // recycled and active particle views
    this._freeParticles = [];
    this._activeParticles = [];

    // pre-initialization
    var initCount = opts.initCount;
    initCount && this._initParticlePool(initCount);
    this._initCount = initCount;
    this._logViewCreation = initCount > 0;

    this._globalTransform = new Matrix2D();
  }

  project (position) {
    var x = position.x;
    var y = position.y;
    var z = position.z;

    position.x = (x - y) * 0.5;
    position.y = (x + y + z + z) * 0.25;
    position.z = Math.floor(position.y - z * 0.5);

    return position;
  }

  unproject (position) {
    var x = position.x;
    var y = position.y * 2;

    position.z = 0;
    position.x = y + x;
    position.y = y - x;

    return position;
  }

  getZIndex (position) {
    helperVector.x = position.x;
    helperVector.y = position.y;
    helperVector.z = position.z;
    return this.project(helperVector).z;
  }

  _initParticlePool (count) {
    for (var i = 0; i < count; i++) {
      this._freeParticles.push(new Particle(this));
    }
  }

  _forceLoad () {
    for (var p = 0; p < this._activeParticles.length; p += 1) {
      var particle = this._activeParticles[p];
      var image = particle._image;
      if (image) {
        image._forceLoad();
      }
    }
    this._loaded = true;
  }

  _addAssetsToList (assetURLs) {
    for (var p = 0; p < this._activeParticles.length; p += 1) {
      var particle = this._activeParticles[p];
      var image = particle._image;
      if (image) {
        image._addAssetsToList(assetURLs);
      }
    }
  }


  render (ctx, transform, parentOpacity) {
    if (this._needsSorting) {
      this._activeParticles.sort(function (a, b) {
        return a.style._zIndex - b.style._zIndex;
      });
    }

    for (var p = 0; p < this._activeParticles.length; p += 1) {
      var particle = this._activeParticles[p];
      var image = particle._image;
      // debugger
      if (image) {
        var style = particle.style;
        this.updateGlobalTransform(transform, style);

        var gt = this._globalTransform;
        ctx.setTransform(gt.a, gt.b, gt.c, gt.d, gt.tx, gt.ty);
        ctx.globalAlpha = style.opacity * parentOpacity;

        var savedCompositeOperation;
        var compositeOperation = style.compositeOperation;
        if (compositeOperation) {
          savedCompositeOperation = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = compositeOperation;
        }

        var filter = particle._filter;
        if (filter) {
          ctx.setFilter(filter);
        } else {
          ctx.clearFilter();
        }

        image.renderShort(ctx, 0, 0, style.width, style.height);

        if (compositeOperation) {
          ctx.globalCompositeOperation = savedCompositeOperation;
        }

        if (filter) {
          ctx.clearFilter();
        }
      }
    }
  }

  updateGlobalTransform (pgt, style) {
    var flipX = style.flipX ? -1 : 1;
    var flipY = style.flipY ? -1 : 1;

    var gt = this._globalTransform;
    var sx = style.scaleX * style.scale * flipX;
    var sy = style.scaleY * style.scale * flipY;
    var ax = style.flipX ? style.width - style.anchorX : style.anchorX;
    var ay = style.flipY ? style.height - style.anchorY : style.anchorY;
    var tx = style.x + style.offsetX + style.anchorX;
    var ty = style.y + style.offsetY + style.anchorY;

    if (style.r === 0) {
      tx -= ax * sx;
      ty -= ay * sy;
      gt.a = pgt.a * sx;
      gt.b = pgt.b * sx;
      gt.c = pgt.c * sy;
      gt.d = pgt.d * sy;
      gt.tx = tx * pgt.a + ty * pgt.c + pgt.tx;
      gt.ty = tx * pgt.b + ty * pgt.d + pgt.ty;
    } else {
      if (style.r !== style._cachedRotation) {
        style._cachedRotation = style.r;
        style._cachedSin = Math.sin(style.r);
        style._cachedCos = Math.cos(style.r);
      }
      var a = style._cachedCos * sx;
      var b = style._cachedSin * sx;
      var c = -style._cachedSin * sy;
      var d = style._cachedCos * sy;

      if (ax || ay) {
        tx -= a * ax + c * ay;
        ty -= b * ax + d * ay;
      }

      gt.a = a * pgt.a + b * pgt.c;
      gt.b = a * pgt.b + b * pgt.d;
      gt.c = c * pgt.a + d * pgt.c;
      gt.d = c * pgt.b + d * pgt.d;
      gt.tx = tx * pgt.a + ty * pgt.c + pgt.tx;
      gt.ty = tx * pgt.b + ty * pgt.d + pgt.ty;
    }
  }

  obtainParticleArray (count) {

    // TODO: reenable performance component?
    // opts = opts || {};
    // count = performance.getAdjustedParticleCount(count, opts.performanceScore, opts.allowReduction);

    for (var i = 0; i < count; i++) {
      // var particle = new Particle(this);
      var particle = this._freeParticles.pop();
      if (!particle) {
        particle = new Particle(this);
        if (this._logViewCreation) {
          logger.warn(this.getTag(), 'created Particle');
        }
      }
      this._particleDataArray.push(particle);
    }

    // OK to use an array here
    return this._particleDataArray;
  }

  _killParticle (particle, index) {
    particle.reset();

    this._activeParticles.splice(index, 1);
    this._freeParticles.push(particle);
  }

  killAllParticles () {
    for (var i = 0; i < this._activeParticles.length; i++) {
      this._activeParticles[i].reset();
    }
    this._freeParticles = this._activeParticles;
    this._activeParticles = [];
  }

  _addExternalParticle (particle, data) {
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
  }

  addExternalParticles (views, data) {
    var count = data.length;
    for (var i = 0; i < count; i++) {
      var obj = data.pop();
      var view = views.pop();
      if (view && obj) {
        this._addExternalParticle(view, obj);
      }
    }
  }

  emitParticles (particleDataArray) {
    for (var i = 0; i < particleDataArray.length; i++) {
      // get particle data object and recycled view if possible
      var particle = particleDataArray[i];

      // apply style properties
      var s = particle.style;

      if (this._isometric) {
        helperVector.x = particle.x;
        helperVector.y = particle.y;
        helperVector.z = particle.z;

        this.project(helperVector);

        s.x = helperVector.x;
        s.y = helperVector.y;
        s.zIndex = helperVector.z;
      } else {
        s.x = particle.x;
        s.y = particle.y;
      }

      s.r = particle.r;
      s.anchorX = particle.anchorX;
      s.anchorY = particle.anchorY;
      s.offsetX = particle.offsetX;
      s.offsetY = particle.offsetY;
      s.width = particle.width;
      s.height = particle.height;
      s.scale = particle.scale;
      s.scaleX = particle.scaleX;
      s.scaleY = particle.scaleY;
      s.opacity = particle.opacity;
      s.flipX = particle.flipX;
      s.flipY = particle.flipY;
      s.compositeOperation = particle.compositeOperation;
      s.visible = particle.visible;

      // start particles if there's no delay
      if (!particle.delay) {
        s.visible = true;
        particle.onStart && particle.onStart(particle);
      } else if (particle.delay < 0) {
        throw new Error('Particles cannot have negative delay values!');
      }

      if (particle.ttl < 0) {
        throw new Error(
          'Particles cannot have negative time-to-live values!');
      }

      // and finally emit the particle
      this._prepareTriggers(particle);
      this._activeParticles.push(particle);
    }

    particleDataArray.length = 0;
  }

  _prepareTriggers (particle) {
    var triggers = particle.triggers;
    for (var i = 0; i < triggers.length; i++) {
      var trig = triggers[i];
      trig.isStyle = trig.isStyle !== void 0 ? trig.isStyle : trig.property
        .charAt(0) !== 'd';
    }
  }

  runTick (dt) {
    var i = 0;
    while (i < this._activeParticles.length) {
      var particle = this._activeParticles[i];
      var s = particle.style;
      var data = particle;

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
        this._killParticle(particle, i);
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

      var pX = data.x;
      var pY = data.y;
      var pZ = data.z;

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
        data.dz += pct * data.ddz;
        // polar position
        pX = data.x = data.ox + data.radius * Math.cos(data.theta);
        pY = data.y = data.oy + data.radius * Math.sin(data.theta);
        pZ = data.z = data.z + pct * data.dz;
      } else {
        // cartesian by default
        var dx = pct * data.dx;
        if (dx !== 0) {
          pX = data.x += dx;
        }
        var dy = pct * data.dy;
        if (dy !== 0) {
          pY = data.y += dy;
        }
        var dz = pct * data.dz;
        if (dz !== 0) {
          pZ = data.z += dz;
        }
        data.dx += pct * data.ddx;
        data.dy += pct * data.ddy;
        data.dz += pct * data.ddz;
      }

      if (this._isometric) {
        helperVector.x = pX;
        helperVector.y = pY;
        helperVector.z = pZ;

        this.project(helperVector);

        s.x = helperVector.x;
        s.y = helperVector.y;
        s.zIndex = helperVector.z;
      } else {
        s.x = pX;
        s.y = pY;
      }

      // anchor translation
      var dax = pct * data.danchorX;
      if (dax !== 0) {
        s.anchorX = data.anchorX += dax;
      }
      var day = pct * data.danchorY;
      if (day !== 0) {
        s.anchorY = data.anchorY += day;
      }
      data.danchorX += pct * data.ddanchorX;
      data.danchorY += pct * data.ddanchorY;

      // stretching
      var dw = pct * data.dwidth;
      if (dw !== 0) {
        s.width = data.width += dw;
      }
      var dh = pct * data.dheight;
      if (dh !== 0) {
        s.height = data.height += dh;
      }
      data.dwidth += pct * data.ddwidth;
      data.dheight += pct * data.ddheight;

      // rotation
      var dr = pct * data.dr;
      if (dr !== 0) {
        s.r = data.r += dr;
      }
      data.dr += pct * data.ddr;

      // scaling
      var ds = pct * data.dscale;
      if (ds !== 0) {
        s.scale = data.scale = Math.max(0, data.scale + ds);
      }
      var dsx = pct * data.dscaleX;
      if (dsx !== 0) {
        s.scaleX = data.scaleX = Math.max(0, data.scaleX + dsx);
      }
      var dsy = pct * data.dscaleY;
      if (dsy !== 0) {
        s.scaleY = data.scaleY = Math.max(0, data.scaleY + dsy);
      }
      data.dscale += pct * data.ddscale;
      data.dscaleX += pct * data.ddscaleX;
      data.dscaleY += pct * data.ddscaleY;

      // opacity
      var dop = pct * data.dopacity;
      if (dop !== 0) {
        s.opacity = data.opacity = Math.max(0, Math.min(1, data.opacity + dop));
      }
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
  }

  getActiveParticles () {
    return this._activeParticles;
  }

  forEachActiveParticle (fn, ctx) {
    var views = this._activeParticles;
    for (var i = views.length - 1; i >= 0; i--) {
      fn.call(ctx, views[i], i);
    }
  }
}
