import animate;
import animate.transitions as easingFunctions;
import ui.View as View;
import ui.ImageView as ImageView;
import ui.filter as filter;

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
  // be careful animating zIndex, re-sorting views may be expensive
  zIndex: 0,
  // offset coordinates reserved for polar effects
  // offsetX: 0,
  // offsetY: 0,
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

var FILTER_DEFAULTS = {
  filterRed: 0,
  filterGreen: 0,
  filterBlue: 0,
  filterAlpha: 1
};

var PROPERTY_DEFAULTS = {};
merge(PROPERTY_DEFAULTS, STYLE_DEFAULTS);
merge(PROPERTY_DEFAULTS, POLAR_DEFAULTS);
merge(PROPERTY_DEFAULTS, FILTER_DEFAULTS);

var OTHER_DEFAULTS = {
  flipX: false,
  flipY: false,
  delay: 0,
  ttl: 1000,
  image: "",
  filterType: "",
  compositeOperation: ""
};

var STYLE_KEYS = Object.keys(STYLE_DEFAULTS);
var STYLE_KEY_COUNT = STYLE_KEYS.length;
var POLAR_KEYS = Object.keys(POLAR_DEFAULTS);
var POLAR_KEY_COUNT = POLAR_KEYS.length;
var FILTER_KEYS = Object.keys(FILTER_DEFAULTS);
var FILTER_KEY_COUNT = FILTER_KEYS.length;
var PROPERTY_KEYS = Object.keys(PROPERTY_DEFAULTS);
var PROPERTY_KEY_COUNT = PROPERTY_KEYS.length;
var OTHER_KEYS = Object.keys(OTHER_DEFAULTS);
var OTHER_KEY_COUNT = OTHER_KEYS.length;

var FILTER_TYPES = [
  "LinearAdd",
  "Multiply",
  "Tint"
];



/**
 * EffectsEngine Notes
 *  this engine is designed to
 *    expand on the original timestep ParticleEngine
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

    // wait until engine initialization completes before subscribing to tick
    setTimeout(function () {
      jsio('import ui.Engine').get().on('Tick', onTick);
    }, 0);
  };

  this.emitEffectsFromData = function (data, opts) {
    opts = opts || {};
    opts.id = opts.id || "" + effectUID++;
    opts.superview = opts.superview || this;
    opts.x = opts.x || 0;
    opts.y = opts.y || 0;

    // allow data to be an array of effects
    if (isArray(data)) {
      data.forEach(function (effect) {
        emitEffect.call(this, effect, opts);
      });
    } else {
      emitEffect.call(this, data, opts);
    }

    return opts.id;
  };

  this.pauseEffectByID = function (id) {
    effectPool.forEachActive(function (effect) {
      if (effect.id === id) {
        effect.pause();
      }
    });
  };

  this.pauseAllEffects = function () {
    effectPool.forEachActive(function (effect) {
      effect.pause();
    });
  };

  this.resumeEffectByID = function (id) {
    effectPool.forEachActive(function (effect) {
      if (effect.id === id) {
        effect.resume();
      }
    });
  };

  this.resumeAllEffects = function () {
    effectPool.forEachActive(function (effect) {
      effect.resume();
    });
  };

  this.clearEffectByID = function (id) {
    effectPool.forEachActive(function (effect) {
      if (effect.id === id) {
        effect.clear();
      }
    });
  };

  this.clearAllEffects = function () {
    effectPool.forEachActive(function (effect) {
      effect.clear();
    });
  };

  this.validateData = function (data) {
    if (typeof data === 'string') {
      data = this.loadDataFromJSON(data);
    }

    // all image URLs should be non-empty strings
    var image = data.image;
    if (isArray(image)) {
      if (!image.length) {
        throw new Error("Empty array found, expected image URL strings:", data);
      } else {
        image.forEach(function (url) {
          validateImage(url, data);
        });
      }
    } else {
      validateImage(image, data);
    }

    // if a filter type exists, it should be one of the supported types
    if (data.filterType) {
      if (FILTER_TYPES.indexOf(data.filterType) === -1) {
        throw new Error("Invalid filter type:", data.filterType, data);
      }
    }

    // TODO: validate other property variables

    var params = data.parameters;
    if (params) {
      if (!isArray(params)) {
        throw new Error("Parameters should be an array:", params, data);
      }

      // check each parameter individually and guarantee no duplicates
      var paramList = {};
      for (var i = 0; i < params.length; i++) {
        validateParameter(params[i], paramList, data);
      }
    }

    // TODO: move data validation here
  };

  this.loadDataFromJSON = function (url) {
    try {
      var data = CACHE[url];
      if (typeof data === 'string') {
        data = CACHE[url] = JSON.parse(data);
      }
      if (typeof data !== 'object') {
        throw new Error("JSON file not found in your project:", url);
      }
      return data;
    } catch (e) { throw e; }
  };

  this.getActiveParticleCount = function () {
    return particlePool._freshIndex;
  };

  function emitEffect (data, opts) {
    // allow data to be a JSON URL string
    if (typeof data === 'string') {
      data = this.loadDataFromJSON(data);
    }

    // allow data validation to be skipped for performance or other reasons
    if (!opts.skipDataValidation) {
      this.validateData(data);
    }

    effectPool.obtain().reset(data, opts);
  };

  function onTick (dt) {
    particlePool.forEachActive(function (particle) { particle.step(dt); });
    effectPool.forEachActive(function (effect) { effect.step(dt); });
  };

  function validateImage (url, data) {
    if (!url || typeof url !== 'string') {
      throw new Error("Invalid image URL:", url, data);
    }
  };

  function validateParameter (paramData, paramList, data) {
    var paramID = paramData.id;
    if (paramID === void 0) {
      throw new Error("Undefined parameter ID:", paramData, data);
    }

    if (paramList[paramID]) {
      throw new Error("Duplicate parameter ID defined:", paramID, data);
    }

    // TODO: validate other parameter variables

    paramList[paramID] = paramData;
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
    this.x = 0;
    this.y = 0;
    this.count = 0;
    this.isPaused = false;
    this.isContinuous = false;
    this.data = null;
    this.opts = null;
    this.activeParticleCount = 0;
    this.activeParameters = {};
    // ObjectPool book-keeping
    this._poolIndex = 0;
    this._obtainedFromPool = false;
  };

  this.reset = function (data, opts) {
    this.id = opts.id;
    this.x = opts.x;
    this.y = opts.y;
    this.isPaused = false;
    this.isContinuous = data.continuous || false;
    this.data = data;
    this.opts = opts;
    this.activeParticleCount = 0;

    // set up parameters for this effect
    var params = data.parameters;
    if (params) {
      for (var i = 0; i < params.length; i++) {
        var paramData = params[i];
        var param = parameterPool.obtain();
        param.reset(this, paramData);
        this.activeParameters[paramData.id] = param;
      }
    }

    // support value, range, and params for particle count
    this.count = getNumericValueFromData(this, data.count, 1);

    // emit immediately if not a continuous effect
    if (!this.isContinuous) {
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
    var effect = this;
    particlePool.forEachActive(function (particle) {
      if (particle.effect === effect) {
        particle.pause();
      }
    });
    this.isPaused = true;
  };

  this.resume = function () {
    var effect = this;
    particlePool.forEachActive(function (particle) {
      if (particle.effect === effect) {
        particle.resume();
      }
    });
    this.isPaused = false;
  };

  this.clear = function () {
    var effect = this;
    particlePool.forEachActive(function (particle) {
      if (particle.effect === effect) {
        particle.recycle();
      }
    });
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
      // update parameters for each particle emission
      for (var j = 0; j < paramCount; j++) {
        var param = this.activeParameters[paramKeys[j]];
        param && param.update(1 / count, true);
      }
    }
  };

  this.step = function (dt) {
    if (this.isPaused) {
      return;
    }

    // step parameters each tick
    var paramKeys = Object.keys(this.activeParameters);
    var paramCount = paramKeys.length;
    for (var i = 0; i < paramCount; i++) {
      var param = this.activeParameters[paramKeys[i]];
      param && param.step(dt);
    }

    if (this.isContinuous) {
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
    this.filter = new filter.Filter({});
    this.filterData = { type: "", r: 0, g: 0, b: 0, a: 0 };
    this.currentImageURL = "";
    this.isPolar = false;
    this.hasDeltas = false;
    this.isPaused = false;
    this.effect = null;
    this.elapsed = 0;

    for (var i = 0; i < PROPERTY_KEY_COUNT; i++) {
      // particle properties are never recycled, so ignore the propertyPool
      this[PROPERTY_KEYS[i]] = new Property();
    }

    for (var i = 0; i < OTHER_KEY_COUNT; i++) {
      var key = OTHER_KEYS[i];
      this[key] = OTHER_DEFAULTS[key];
    }

    // ObjectPool book-keeping
    this._poolIndex = 0;
    this._obtainedFromPool = false;
  };

  this.reset = function (effect) {
    this.view.removeFilter();
    this.isPolar = false;
    this.hasDeltas = false;
    this.isPaused = false;
    this.effect = effect;
    this.elapsed = 0;

    var s = this.view.style;
    var data = effect.data;
    var opts = effect.opts;

    // reset other properties first, animated props are dependent on ttl
    for (var i = 0; i < OTHER_KEY_COUNT; i++) {
      var key = OTHER_KEYS[i];
      var defaultValue = OTHER_DEFAULTS[key];
      if (typeof defaultValue === 'number') {
        // support value, range, and params for ttl and delay
        this[key] = getNumericValueFromData(effect, data[key], defaultValue);
      } else {
        this[key] = data[key] || defaultValue;
      }
    }

    // reset animated properties with data or to their defaults
    for (var i = 0; i < PROPERTY_KEY_COUNT; i++) {
      var key = PROPERTY_KEYS[i];
      var prop = this[key];
      prop.reset(this, key, data[key]);
      if (prop.delta) {
        this.hasDeltas = true;
      }
    }

    // apply the proper initial color filter
    if (this.filterType) {
      this.filterData.type = this.filterType;
      this.updateFilter();
      this.view.setFilter(this.filter);
    }

    // prepare the image url for this particle
    var image = data.image;
    var imageURL = isArray(image) ? choose(image) : image;
    // only update the image if necessary
    if (this.currentImageURL !== imageURL) {
      this.currentImageURL = imageURL;
      this.view.setImage(imageURL);
    }

    // add this particle to the view hierarchy
    opts.superview.addSubview(this.view);

    // determine whether this particle is in polar or cartesian coordinates
    for (var i = 0; i < POLAR_KEY_COUNT; i++) {
      if (this[POLAR_KEYS[i]].isModified) {
        this.isPolar = true; break;
      }
    }

    // apply initial view style properties
    for (var i = 0; i < STYLE_KEY_COUNT; i++) {
      var key = STYLE_KEYS[i];
      s[key] = this[key].value;
    }
    s.flipX = this.flipX;
    s.flipY = this.flipY;
    s.compositeOperation = this.compositeOperation;

    // apply polar offsets and effect positioning offsets
    if (this.isPolar) {
      s.offsetX = effect.x + this.radius.value * cos(this.theta.value);
      s.offsetY = effect.y + this.radius.value * sin(this.theta.value);
    } else {
      s.offsetX = effect.x;
      s.offsetY = effect.y;
    }

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

  this.pause = function () {
    for (var i = 0; i < PROPERTY_KEY_COUNT; i++) {
      this[PROPERTY_KEYS[i]].pause();
    }
    this.isPaused = true;
  };

  this.resume = function () {
    for (var i = 0; i < PROPERTY_KEY_COUNT; i++) {
      this[PROPERTY_KEYS[i]].resume();
    }
    this.isPaused = false;
  };

  this.step = function (dt) {
    if (this.isPaused) {
      return;
    }

    var s = this.view.style;

    if (this.delay > 0) {
      this.delay -= dt;
      if (this.delay <= 0) {
        s.visible = true;
      } else {
        return;
      }
    }

    this.elapsed += dt;
    if (this.elapsed >= this.ttl) {
      this.recycle();
    }

    if (this.hasDeltas) {
      for (var i = 0; i < STYLE_KEY_COUNT; i++) {
        var key = STYLE_KEYS[i];
        var prop = this[key];
        if (prop.delta) {
          prop.applyDelta(dt);
          s[key] = prop.value;
        }
      }

      if (this.isPolar) {
        for (var i = 0; i < POLAR_KEY_COUNT; i++) {
          var key = POLAR_KEYS[i];
          var prop = this[key];
          prop.delta && prop.applyDelta(dt);
        }
      }
    }

    if (this.isPolar) {
      s.offsetX = this.effect.x + this.radius.value * cos(this.theta.value);
      s.offsetY = this.effect.y + this.radius.value * sin(this.theta.value);
    }

    // update filter each tick if its values change over time
    if (this.filterType
      && (!this.filterRed.isStatic
        || !this.filterGreen.isStatic
        || !this.filterBlue.isStatic
        || !this.filterAlpha.isStatic))
    {
      this.updateFilter();
    }
  };

  this.updateFilter = function () {
    this.filterData.r = max(0, min(255, ~~(this.filterRed.value + 0.5)));
    this.filterData.g = max(0, min(255, ~~(this.filterGreen.value + 0.5)));
    this.filterData.b = max(0, min(255, ~~(this.filterBlue.value + 0.5)));
    this.filterData.a = max(0, min(1, this.filterAlpha.value));
    this.filter.update(this.filterData);
  };
});



/**
 * Property Notes
 *  properties represent a value on a particle that can update over time
 *  they can be stepped by delta values (i.e. velocity) or by timestep animate
 *  properties on the root particle are never recycled, so they animate the view
 *  properties used as deltas on other properties are always recycled
 */
var Property = Class("Property", function () {
  this.init = function () {
    this.value = 0;
    this.delta = null;
    this.animator = null;
    this.isStatic = true;
    this.isModified = false;
    // ObjectPool book-keeping
    this._poolIndex = 0;
    this._obtainedFromPool = false;
  };

  this.reset = function (particle, key, data) {
    this.delta = null;
    this.isStatic = true;
    this.isModified = false;

    // create an animator with the proper subject (it never changes, see notes)
    var isStyleProp = STYLE_KEYS.indexOf(key) >= 0;
    if (!this.animator) {
      this.animator = animate(isStyleProp ? particle.view : this, key);
    } else {
      this.animator.clear();
    }

    // set the initial value of the property
    var defaultValue = key !== 'delta' ? PROPERTY_DEFAULTS[key] : 0;
    this.value = getNumericValueFromData(particle.effect, data, defaultValue);

    // change over time represented by animated target values or deltas
    if (typeof data === 'object') {
      // animate to target values or apply deltas over time
      var targets = data.targets;
      var delta = data.delta;
      if (targets && targets.length) {
        // make sure we animate the correct key
        var animKey = isStyleProp ? key : 'value';
        // chain the animations once the particle has begun to live
        this.animator.wait(particle.delay);
        for (var i = 0; i < targets.length; i++) {
          this.addTargetAnimation(particle, targets[i], animKey);
        }
        this.isModified = true;
        this.isStatic = false;
      } else if (delta) {
        // apply a delta each tick (usually measured in pixels per second)
        this.delta = propertyPool.obtain();
        this.delta.reset(particle, 'delta', delta);
        this.isModified = this.delta.isModified;
        this.isStatic = !this.isModified;
      }
    }

    // whether this value was or will be changed from its default
    this.isModified = this.isModified || this.value !== defaultValue;
  };

  this.addTargetAnimation = function (particle, target, animKey) {
    // these time values are percentages of the particle's ttl
    var delay = getNumericValueFromData(particle.effect, target.delay, 0);
    var duration = getNumericValueFromData(particle.effect, target.duration, 0);
    if (delay < 0) {
      throw new Error("Animations cannot have negative delays!");
    }
    if (duration < 0) {
      throw new Error("Animations cannot have negative durations!");
    }

    // find the appropriate animate easing function ID
    var easing = target.easing;
    if (easing) {
      if (easing in easingFunctions) {
        easing = animate[easing];
      } else {
        throw new Error("Invalid easing function name:", easing);
      }
    } else {
      easing = animate.linear;
    }

    // prepare an animation object
    var animObj = {};
    animObj[animKey] = getNumericValueFromData(particle.effect, target, 0);
    // append the animation to the chain
    this.animator
      .wait(delay * particle.ttl)
      .then(animObj, duration * particle.ttl, easing);
  };

  this.applyDelta = function (dt) {
    // deltas are measured in units per second
    var seconds = dt / 1000;
    // apply deltas half before and half after delta deltas for smoother frames
    this.value += seconds * this.delta.value / 2;
    this.delta.delta && this.delta.applyDelta(dt);
    this.value += seconds * this.delta.value / 2;
  };

  this.recycle = function (isFree) {
    if (this.delta) {
      this.delta.recycle(true);
    }
    isFree && propertyPool.release(this);
  };

  this.pause = function () {
    this.animator.pause();
    this.delta && this.delta.pause();
  };

  this.resume = function () {
    this.animator.resume();
    this.delta && this.delta.resume();
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
    this.elapsed = 0;
    this.resetInterval = 16;
    this.reverseReset = false;
    this.distributionType = "indexOverTime";
    this.distributionFunction = easingFunctions["linear"];
    // ObjectPool book-keeping
    this._poolIndex = 0;
    this._obtainedFromPool = false;
  };

  this.reset = function (effect, data) {
    this.id = "" + data.id;
    this.value = 0;
    this.elapsed = 0;
    this.resetInterval = data.resetInterval || 16;
    this.reverseReset = data.reverseReset || false;
    this.distributionType = data.distributionType || "indexOverTime";
    this.distributionFunction = easingFunctions["linear"];

    // find the appropriate animate easing function
    var distFnName = data.distributionFunction;
    if (distFnName) {
      if (distFnName in easingFunctions) {
        this.distributionFunction = easingFunctions[distFnName];
      } else {
        throw new Error("Invalid distributionFunction:", distFnName);
      }
    }

    this.update(0, false);
  };

  this.recycle = function () {
    parameterPool.release(this);
  };

  this.update = function (value, fromEmission) {
    var type = this.distributionType;
    if (fromEmission && type === "time") {
      return;
    }

    if (type === "random") {
      this.value = random();
    } else {
      value += fromEmission ? this.value : 0;
      if (this.reverseReset) {
        // value moves back and forth between 1 and 0
        while (value > 1 || value < 0) {
          if (value > 1) {
            value = 1 - (value - 1);
          } else {
            value *= -1;
          }
        }
        this.value = value;
      } else {
        // value resets to 0 when it exceeds 1
        this.value = value % 1;
      }
    }
  };

  // only continuous effects step their parameters
  this.step = function (dt) {
    var type = this.distributionType;
    if (type === "time" || type === "indexOverTime") {
      this.elapsed += dt;
      // keep elapsed small so update's while loop doesn't grow over time
      if (this.reverseReset) {
        this.elapsed = this.elapsed % (2 * this.resetInterval);
      } else {
        this.elapsed = this.elapsed % this.resetInterval;
      }
      this.update(this.elapsed / this.resetInterval, false);
    }
  };

  this.getValueBetween = function (minVal, maxVal) {
    var diff = maxVal - minVal;
    return minVal + diff * this.distributionFunction(this.value);
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
function getNumericValueFromData (effect, data, defaultValue) {
  var value = defaultValue;
  var dataType = typeof data;
  if (dataType === 'object') {
    var range = data.range;
    if (range && range.length >= 2) {
      var minVal = range[0];
      var maxVal = range[1];
      if (range.length === 3) {
        // set value based on a parameterized range
        var paramID = range[2];
        var param = effect.activeParameters[paramID];
        if (param) {
          value = param.getValueBetween(minVal, maxVal);
        } else {
          throw new Error("Invalid parameter ID for effect:", effect, range);
        }
      } else {
        // set value based on a random range
        value = rollFloat(minVal, maxVal);
      }
    } else if (typeof data.value === 'number') {
      // value can also be a number within the data object
      value = data.value;
    }
  } else if (dataType === 'number') {
    // the data itself might be a number intended as the value
    value = data;
  }
  return value;
};



// private class-wide pools and singleton exports
var parameterPool = new ObjectPool(Parameter);
var propertyPool = new ObjectPool(Property);
var particlePool = new ObjectPool(Particle);
var effectPool = new ObjectPool(Effect);
exports = new EffectsEngine();
