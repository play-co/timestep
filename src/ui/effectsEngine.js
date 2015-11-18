import animate;
import animate.transitions as easingFunctions;
import ui.View as View;
import ui.ImageView as ImageView;

var sin = Math.sin;
var cos = Math.cos;
var min = Math.min;
var max = Math.max;
var floor = Math.floor;
var random = Math.random;
var choose = function (a) { return a[floor(random() * a.length)]; };
var rollFloat = function (n, x) { return n + random() * (x - n); };

var STYLE_DEFAULTS = {
  x: 0,
  y: 0,
  zIndex: 0,
  offsetX: 0,
  offsetY: 0,
  anchorX: 0,
  anchorY: 0,
  r: 0,
  width: 10,
  height: 10,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  opacity: 1
};

var POLAR_DEFAULTS = {
  theta: 0,
  radius: 0
};

var PROPERTY_DEFAULTS = {};
merge(PROPERTY_DEFAULTS, STYLE_DEFAULTS);
merge(PROPERTY_DEFAULTS, POLAR_DEFAULTS);

var OTHER_DEFAULTS = {
  flipX: false,
  flipY: false,
  compositeOperation: "",
  ttl: 1000,
  delay: 0,
  image: ""
};

var STYLE_KEYS = Object.keys(STYLE_DEFAULTS);
var STYLE_KEY_COUNT = STYLE_KEYS.length;
var POLAR_KEYS = Object.keys(POLAR_DEFAULTS);
var POLAR_KEY_COUNT = POLAR_KEYS.length;
var PROPERTY_KEYS = Object.keys(PROPERTY_DEFAULTS);
var PROPERTY_KEY_COUNT = PROPERTY_KEYS.length;
var OTHER_KEYS = Object.keys(OTHER_DEFAULTS);
var OTHER_KEY_COUNT = OTHER_KEYS.length;



/**
 * EffectsEngine Notes
 *  this engine is designed to
 *    expand on the original timestep ParticleEngine while fixing its problems
 *    take advantage of timestep animate's
 *      API (target values over time with easing functions)
 *      and native acceleration
 *    use near-zero garbage-collection
 *    and to consume JSON data to emit effects from a single line of code
 */
var EffectsEngine = Class(View, function () {
  var superProto = View.prototype;
  var effectUID = 0;

  this.init = function () {
    superProto.init.call(this, {
      canHandleEvents: false,
      blockEvents: true
    });
  };

  this.emitEffectsFromData = function (data, opts) {
    opts = opts || {};
    opts.id = opts.id || "" + effectUID++;
    opts.superview = opts.superview || this;
    opts.x = opts.x || 0;
    opts.y = opts.y || 0;

    if (isArray(data)) {
      data.forEach(function (effect) {
        emitEffect(effect, opts);
      });
    } else {
      emitEffect(data, opts);
    }

    return opts.id;
  };

  function emitEffect (data, opts) {
    var effect = effectPool.obtain();
    effect.reset(data, opts);
  };

  this.tick = function (dt) {
    particlePool.forEachActive(function (particle) {
      particle.step(dt);
    });
    effectPool.forEachActive(function (effect) {
      effect.step(dt);
    });
  };
});



/**
 * Effect Notes
 *  an effect is a group of particles that share the same data definition
 *  most "particle effects" are created by several of these
 */
var Effect = Class("Effect", function () {
  this.init = function () {
    this.id = "";
    this.count = 0;
    this.continuous = false;
    this.data = null;
    this.opts = null;
    this.activeParticleCount = 0;
    this.activeParameters = {};
  };

  this.reset = function (data, opts) {
    this.id = opts.id;
    this.count = data.count || 1;
    this.continuous = data.continuous || false;
    this.data = data;
    this.opts = opts;
    this.activeParticleCount = 0;

    // set up parameters for this effect
    var params = data.parameters;
    if (params) {
      for (var i = 0; i < params.length; i++) {
        var paramID = paramData.id;
        if (this.activeParameters[paramID]) {
          throw new Error("Duplicate parameter ID defined:", paramID, data);
        }
        var param = parameterPool.obtain();
        var paramData = params[i];
        param.reset(this, paramData);
        this.activeParameters[paramID] = param;
      }
    }

    // emit immediately if not a continuous effect
    if (!this.continuous) {
      this.emitParticles();
    }
  };

  this.recycle = function () {
    var params = this.activeParameters;
    for (var id in params) {
      var param = params[id];
      param && param.recycle();
      params[id] = null;
    }
    effectPool.release(this);
  };

  this.pause = function () {
    // TODO: pause all related particles
  };

  this.resume = function () {
    // TODO: resume all related particles
  };

  this.stop = function () {
    // TODO: recycle all related particles, params, etc. and the effect itself
    this.recycle();
  };

  this.emitParticles = function () {
    var chance = this.count % 1;
    var count = floor(this.count) + (random() < chance ? 1 : 0);
    var paramKeys = Object.keys(this.activeParameters);
    var paramCount = paramKeys.length;
    for (var i = 0; i < count; i++) {
      var particle = particlePool.obtain();
      particle.reset(this);
      this.activeParticleCount++;

      if (!this.continuous) {
        for (var j = 0; j < paramCount; j++) {
          var param = this.activeParameters[paramKeys[j]];
          param && param.update(i / count);
        }
      }
    }
  };

  this.step = function (dt) {
    if (this.continuous) {
      // step continuous parameters each tick
      var paramKeys = Object.keys(this.activeParameters);
      var paramCount = paramKeys.length;
      for (var i = 0; i < paramCount; i++) {
        var param = this.activeParameters[paramKeys[i]];
        param && param.step(dt);
      }
      // emit particles for continuous effects each tick
      this.emitParticles();
    } else if (this.activeParticleCount <= 0) {
      // recycle non-continuous effects when out of active particles
      this.recycle();
    }
  };
});



/**
 * Particle Notes
 *  a particle moves a single ImageView across the screen
 */
var Particle = Class("Particle", function () {
  this.init = function () {
    this.view = new ImageView({ visible: false });
    this.currentImageURL = "";
    this.isPolar = false;
    this.hasDeltas = false;
    this.effect = null;

    for (var i = 0; i < PROPERTY_KEY_COUNT; i++) {
      this[PROPERTY_KEYS[i]] = propertyPool.obtain();
    }

    for (var i = 0; i < OTHER_KEY_COUNT; i++) {
      var key = OTHER_KEYS[i];
      this[key] = OTHER_DEFAULTS[key];
    }

    this._poolIndex = 0;
    this._obtainedFromPool = false;
  };

  this.reset = function (effect) {
    this.isPolar = false;
    this.hasDeltas = false;
    this.effect = effect;

    var s = this.view.style;
    var data = effect.data;
    var opts = effect.opts;

    // reset animated properties with data or to their defaults
    for (var i = 0; i < PROPERTY_KEY_COUNT; i++) {
      var key = PROPERTY_KEYS[i];
      var prop = this[key];
      prop.reset(effect, key, data[key]);
      if (prop.delta) {
        this.hasDeltas = true;
      }
    }

    // reset other properties with data or to their defaults
    for (var i = 0; i < OTHER_KEY_COUNT; i++) {
      var key = OTHER_KEYS[i];
      this[key] = data[key] || OTHER_DEFAULTS[key];
    }

    // prepare the image url for this particle
    var imageURL = "";
    var image = data.image;
    var imageType = typeof image;
    if (imageType === 'string') {
      imageURL = image;
    } else if (isArray(image) && image.length > 0) {
      imageURL = choose(image);
    } else {
      throw new Error("Invalid image URL data:", data.image);
    }
    // only update the image if necessary
    if (this.currentImageURL !== imageURL) {
      this.currentImageURL = imageURL;
      this.view.setImage(imageURL);
    }

    // add this particle to the view hierarchy
    opts.superview.addSubview(this.view);

    // determine whether this particle is in polar or cartesian coordinates
    for (var i = 0; i < POLAR_KEY_COUNT; i++) {
      var key = POLAR_KEYS[i];
      var prop = this[key];
      if (prop.value !== POLAR_DEFAULTS[key] || prop.delta || prop.targets.length) {
        this.isPolar = true;
        break;
      }
    }

    // apply initial view style properties
    for (var i = 0; i < STYLE_KEY_COUNT; i++) {
      var key = STYLE_KEYS[i];
      var prop = this[key];
      var value = prop.value;
      if (key === 'x') {
        if (this.isPolar) {
          value = this.radius.value * cos(this.theta.value);
        }
        value += opts.x;
      } else if (key === 'y') {
        if (this.isPolar) {
          value = this.radius.value * sin(this.theta.value);
        }
        value += opts.y;
      }
      s[key] = value;
    }
    s.flipX = this.flipX;
    s.flipY = this.flipY;
    s.compositeOperation = this.compositeOperation;

    // TODO: apply any animations found in targets

    if (this.delay === 0) {
      s.visible = true;
    } else if (this.delay < 0) {
      throw new Error("Particles cannot have negative delay values!");
    }

    if (this.ttl < 0) {
      throw new Error("Particles cannot have negative time-to-live values!");
    }
  };

  this.recycle = function () {
    this.effect.activeParticleCount--;
    for (var i = 0; i < PROPERTY_KEY_COUNT; i++) {
      this[PROPERTY_KEYS[i]].recycle(false);
    }
    this.view.style.visible = false;
    particlePool.release(this);
  };

  this.step = function (dt) {
    var s = this.view.style;

    if (this.delay > 0) {
      this.delay -= dt;
      if (this.delay <= 0) {
        s.visible = true;
      } else {
        return;
      }
    }

    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.recycle();
    }

    if (this.isPolar) {
      // TODO: polar particle updates to x and y
    }

    if (this.hasDeltas) {
      // TODO: iterate and update deltas
    }
  };
});



/**
 * Property Notes
 *  properties represent a value on a particle that can update over time
 *  they can be stepped by delta values (i.e. velocity) or by targets to aniamte
 */
var Property = Class("Property", function () {
  this.init = function () {
    this.value = 0;
    this.delta = null;
    this.targets = [];
    this._poolIndex = 0;
    this._obtainedFromPool = false;
  };

  this.reset = function (effect, key, data) {
    this.value = 0;
    this.delta = null;
    this.targets.length = 0;

    // setting values based on a random or parameterized range
    if (data.range && data.range.length >= 2) {
      this.value = getValueFromRange(effect, data.range);
    } else if (data.value !== void 0) {
      this.value = data.value;
    } else if (key !== 'delta') {
      this.value = PROPERTY_DEFAULTS[key];
    }

    // animate to target values or apply deltas over time
    if (data.targets && data.targets.length) {
      for (var i = 0; i < data.targets.length; i++) {
        var target = targetPool.obtain();
        target.reset(effect, data.targets[i]);
        this.targets.push(target);
      }
    } else if (data.delta) {
      this.delta = propertyPool.obtain();
      this.delta.reset('delta', data.delta);
    }
  };

  this.recycle = function (isFree) {
    for (var i = 0; i < this.targets.length; i++) {
      this.targets[i].recycle();
    }
    if (this.delta) {
      this.delta.recycle(true);
    }
    isFree && propertyPool.release(this);
  };
});



/**
 * Target Notes
 *  targets represent a value to step towards over time
 *  they are designed to be used by timestep animate
 */
var Target = Class("Target", function () {
  this.init = function () {
    this.value = 0;
    this.delay = 0;
    this.duration = 0;
    this.easing = animate.linear;
  };

  this.reset = function (effect, data) {
    this.value = data.value || 0;
    this.delay = data.delay || 0;
    this.duration = data.duration || 0;
    this.easing = animate.linear;

    // setting values based on a random or parameterized range
    if (data.range && data.range.length >= 2) {
      this.value = getValueFromRange(effect, data.range);
    }

    // find the appropriate animate easing function ID
    var easing = data.easing;
    if (easing) {
      if (easing in easingFunctions) {
        this.easing = animate[easing];
      } else {
        throw new Error("Invalid easing function name:", easing);
      }
    }
  };

  this.recycle = function () {
    targetPool.release(this);
  };
});



/**
 * Parameter Notes
 *  params represent a distribution over time or particle count from [0, 1)
 *  timestep animate's easing functions can be used to add nice patterns
 *  properties are tied to params via a range of the format: [min, max, paramID]
 *
 *  for non-continuous effects,
 *    for random params, the param is re-rolled after each particle
 *    for non-random params, the param is the particle index / count
 *  for continuous effects,
 *    for random params, the param is re-rolled after resetInterval milliseconds
 *    for non-random params, the param is the percent of resetInterval elapsed
 */
var Parameter = Class("Parameter", function () {
  this.init = function () {
    this.id = "";
    this.value = 0;
    this.random = false;
    this.elapsed = 0;
    this.resetInterval = 16;
    this.distribution = easingFunctions["linear"];
  };

  this.reset = function (effect, data) {
    this.id = "" + data.id;
    this.value = 0;
    this.random = data.random || false;
    this.elapsed = 0;
    this.resetInterval = data.resetInterval || 16;
    this.distribution = easingFunctions["linear"];

    // find the appropriate animate easing function
    var distribution = data.distribution;
    if (distribution) {
      if (distribution in easingFunctions) {
        this.distribution = easingFunctions[distribution];
      } else {
        throw new Error("Invalid distribution function name:", distribution);
      }
    }

    this.update(0);
  };

  this.recycle = function () {
    parameterPool.release(this);
  };

  this.update = function (value) {
    if (this.random) {
      this.value = random();
    } else {
      this.value = value;
    }
  };

  // only continuous effects step their parameters
  this.step = function (dt) {
    this.elapsed += dt;
    this.elapsed = this.elapsed % this.resetInterval;
    this.update(this.elapsed / this.resetInterval);
  };

  this.getValueBetween = function (minVal, maxVal) {
    var diff = maxVal - minVal;
    return minVal + diff * this.distribution(this.value);
  };
});



/**
 * Object Pool Notes
 *  jsio classes can be very costly to garbage collect and initialize,
 *  so be good to the environment, and always recycle!
 */
var ObjectPool = Class("ObjectPool", function () {
  this.init = function (ctor) {
    this._ctor = ctor;
    this._pool = [];
    this._freshIndex = 0;
  };

  this.create = function () {
    var pool = this._pool;
    var obj = new this._ctor();
    obj._poolIndex = pool.length;
    pool.push(obj);
    return obj;
  };

  this.obtain = function () {
    var obj;
    var pool = this._pool;
    if (this._freshIndex < pool.length) {
      obj = pool[this._freshIndex];
    } else {
      obj = this.create();
    }
    obj._obtainedFromPool = true;
    this._freshIndex++;
    return obj;
  };

  this.release = function (obj) {
    var pool = this._pool;
    if (obj._obtainedFromPool) {
      obj._obtainedFromPool = false;
      var temp = pool[this._freshIndex - 1];
      pool[this._freshIndex - 1] = obj;
      pool[obj._poolIndex] = temp;
      var tempIndex = temp._poolIndex;
      temp._poolIndex = obj._poolIndex;
      obj._poolIndex = tempIndex;
      this._freshIndex--;
    }
  };

  this.forEachActive = function (fn, ctx) {
    var pool = this._pool;
    for (var i = this._freshIndex - 1; i >= 0; i--) {
      fn.call(ctx, pool[i], i);
    }
  };
});



/**
 * Range Notes
 *  ranges represent a random or parameterized distribution of values
 *  they come in 2 valid formats
 *    [min, max] - a random float between min and max
 *    [min, max, paramID] - a parameterized float between min and max
 */
function getValueFromRange (effect, range) {
  var value = 0;
  var minVal = range[0];
  var maxVal = range[1];
  if (minVal > maxVal) {
    throw new Error("Invalid range in effect, min > max:", effect, range);
  }
  if (range.length === 3) {
    var paramID = range[2];
    var param = effect.activeParameters[paramID];
    if (param) {
      value = param.getValue(minVal, maxVal);
    } else {
      throw new Error("Invalid parameter ID for effect:", effect, range);
    }
  } else {
    value = rollFloat(minVal, maxVal);
  }
  return value;
};



// private class-wide pools and singleton exports
var parameterPool = new ObjectPool(Parameter);
var targetPool = new ObjectPool(Target);
var propertyPool = new ObjectPool(Property);
var particlePool = new ObjectPool(Particle);
var effectPool = new ObjectPool(Effect);
exports = new EffectsEngine();
