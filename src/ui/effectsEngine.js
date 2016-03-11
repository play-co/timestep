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
 * @class ui.effectsEngine
 */

import animate;
import animate.transitions as easingFunctions;
import ui.View as View;
import ui.ImageView as ImageView;
import ui.filter as filter;
import performance;
import ObjectPool;

var sin = Math.sin;
var cos = Math.cos;
var min = Math.min;
var max = Math.max;
var floor = Math.floor;
var random = Math.random;
var choose = function (a) { return a[floor(random() * a.length)]; };
var rollFloat = function (n, x) { return n + random() * (x - n); };

/**
 * Constant Notes
 *  STYLE_DEFAULTS are view.style properties
 *    offsetX and offsetY are excluded from effects; they're used internally
 *  POLAR_DEFAULTS added to support polar coordinates, which is auto-detected
 *  FILTER_DEFAULTS allow changing the color channels of filters over time
 *  PROPERTY_DEFAULTS is the set of numeric properties that can change over time
 */
var STYLE_DEFAULTS = {
  x: 0,
  y: 0,
  zIndex: 0,
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
  image: '',
  filterType: '',
  compositeOperation: ''
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
  'LinearAdd',
  'Multiply',
  'Tint'
];

var PARAMETER_TYPES = [
  'indexOverTime',
  'index',
  'time',
  'random',
  'fixed',
  'custom'
];



/**
 * EffectsEngine Notes
 *  this engine does not replace the original ParticleEngine
 *    but it is considerably more powerful and versatile
 *  uses deltas (px / second) and target values with easing (timestep animate)
 *  animate is applied to views to take advantage of native-core acceleration
 *  supports a JSON data format with validation
 *    use the skipDataValidation option for optimized particle emission
 *  it's a singleton class that uses object pools for minimal garbage-collection
 *  pause, resume, and clear all effects or individual effects by ID
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
    setTimeout(bind(this, function () {
      jsio('import ui.Engine').get().on('Tick', bind(this, onTick));
    }), 0);
  };

  /**
   * @method emitEffectsFromData - the one-and-only particle emission function
   *   @arg {string|object|array} data - the URL to a JSON file or the parsed
   *     JSON data itself (an array of effect objects or a single effect object)
   *   @arg {object} [opts] - a set of options to modify the effect
   *   @arg {string} [opts.id] - effect ID, used to pause, resume, etc. by ID
   *   @arg {View} [opts.superview] - the parent view of the particles' views
   *   @arg {number} [opts.x] - the x coordinate offset of the effect
   *   @arg {number} [opts.y] - the y coordinate offset of the effect
   *   @arg {boolean} [opts.skipDataValidation] - opt of out data validation
   *   @arg {object} [opts.overrides] - key/value pairs in this object will take
   *     precedence over the corresponding key/value pairs in the raw data
   *   @arg {object} [opts.parameterValues] - keys correspond to parameter IDs,
   *     value can be a number [0, 1] or a function that returns a number [0, 1]
   *   @returns {string} id - effect ID, used to pause, resume, etc. by ID
   */
  this.emitEffectsFromData = function (data, opts) {
    opts = opts || {};
    opts.id = opts.id || '' + effectUID++;
    opts.superview = opts.superview || opts.parent || this;
    opts.x = opts.x || 0;
    opts.y = opts.y || 0;

    // allow data to be a JSON URL string
    if (typeof data === 'string') {
      data = this.loadDataFromJSON(data);
    }

    // allow data to be an array of effects
    if (isArray(data)) {
      data.forEach(bind(this, function (effect) {
        emitEffect.call(this, effect, opts);
      }));
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

  this.finishEffectByID = function (id) {
    effectPool.forEachActive(function (effect) {
      if (effect.id === id) {
        effect.finish();
      }
    });
  };

  this.finishAllEffects = function () {
    effectPool.forEachActive(function (effect) {
      effect.finish();
    });
  };

  this.validateData = function (data) {
    // allow data to be a JSON URL string
    if (typeof data === 'string') {
      data = this.loadDataFromJSON(data);
    }

    // allow data to be an array of effects
    if (isArray(data)) {
      data.forEach(validateEffect, this);
    } else {
      validateEffect.call(this, data);
    }
  };

  this.loadDataFromJSON = function (url) {
    try {
      var data = CACHE[url];
      if (typeof data === 'string') {
        data = CACHE[url] = JSON.parse(data);
      }
      if (typeof data !== 'object') {
        throw new Error('JSON file not found in your project: ' + url);
      }
      return data;
    } catch (e) { throw e; }
  };

  this.initializeEffectCount = function (count) {
    count -= effectPool.getTotalCount();
    for (var i = 0; i < count; i++) {
      effectPool.create();
    }
  };

  this.initializeParticleCount = function (count) {
    count -= particlePool.getTotalCount();
    for (var i = 0; i < count; i++) {
      particlePool.create();
    }
  };

  this.initializePropertyCount = function (count) {
    count -= propertyPool.getTotalCount();
    for (var i = 0; i < count; i++) {
      var prop = propertyPool.create();
      // force the property to init its Animator
      prop.reset(this, 'delta', 0);
    }
  };

  this.initializeParameterCount = function (count) {
    count -= parameterPool.getTotalCount();
    for (var i = 0; i < count; i++) {
      parameterPool.create();
    }
  };

  this.getActiveParticleCount = function () {
    return particlePool._freshIndex;
  };

  function emitEffect (data, opts) {
    // allow overrides to replace original JSON properties
    data = mergeOverrides.call(this, data, opts);

    // allow data validation to be skipped for performance
    if (!opts.skipDataValidation) {
      this.validateData(data);
    }

    effectPool.obtain().reset(data, opts);
  };

  function mergeOverrides (data, opts) {
    var mergedData = data;
    if (opts.overrides) {
      mergedData = merge({}, opts.overrides);
      mergedData = merge(mergedData, data);
    }
    return mergedData;
  };

  function onTick (dt) {
    particlePool.forEachActive(function (particle) { particle.step(dt); });
    effectPool.forEachActive(function (effect) { effect.step(dt); });
  };

  function validateEffect (data) {
    // all image URLs should be non-empty strings
    var image = data.image;
    if (isArray(image)) {
      if (!image.length) {
        throw new Error('Empty array found, expected image URL strings');
      } else {
        image.forEach(function (url) {
          validateImage.call(this, url, data);
        });
      }
    } else {
      validateImage.call(this, image, data);
    }

    // if a filter type exists, it should be one of the supported types
    if (data.filterType) {
      if (FILTER_TYPES.indexOf(data.filterType) === -1) {
        throw new Error('Invalid filter type: ' + data.filterType);
      }
    }

    var paramList = {};
    var params = data.parameters;
    if (params) {
      if (!isArray(params)) {
        throw new Error('Parameters should be an array');
      }

      // check each parameter individually and guarantee no duplicates
      for (var i = 0; i < params.length; i++) {
        validateParameter.call(this, params[i], paramList, data);
      }
    }

    // validate particle delay
    validateNumericValue.call(this, data.delay, paramList, data, function (v) {
      if (v < 0) {
        throw new Error('Particles cannot have negative delay values!');
      }
    });

    // validate particle time-to-live
    validateNumericValue.call(this, data.ttl, paramList, data, function (v) {
      if (v < 0) {
        throw new Error('Particles cannot have negative time-to-live values!');
      }
    });

    // validate particle properties
    for (var i = 0; i < PROPERTY_KEY_COUNT; i++) {
      var key = PROPERTY_KEYS[i];
      validateProperty.call(this, data[key], key, paramList, data);
    }
  };

  function validateNumericValue (value, paramList, data, testConstraints) {
    var valueType = typeof value;
    if (valueType === 'object') {
      var range = value.range;
      if (range && range.length >= 2) {
        validateNumber.call(this, range[0], testConstraints, data);
        validateNumber.call(this, range[1], testConstraints, data);
        if (range.length === 3) {
          var paramID = range[2];
          if (paramID && !paramList[paramID]) {
            throw new Error('Invalid parameter ID: ' + paramID);
          }
        } else if (range.length !== 2) {
          throw new Error('Range arrays can only have 2 or 3 elements');
        }
      } else {
        validateNumber.call(this, value.value, testConstraints, data);
      }
    } else {
      validateNumber.call(this, value, testConstraints, data);
    }
  };

  function validateNumber (value, testConstraints, data) {
    // note: undefined is accepted and replaced by default values
    var valueType = typeof value;
    if (valueType !== 'number' && valueType !== 'undefined') {
      throw new Error('Expected a number, but found: ' + value);
    }
    testConstraints && testConstraints.call(this, value, data);
  };

  function validateImage (url, data) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid image URL: ' + url);
    }
  };

  function validateParameter (paramData, paramList, data) {
    var paramID = paramData.id;
    if (paramID === void 0) {
      throw new Error('Undefined parameter ID');
    }

    if (paramList[paramID]) {
      throw new Error('Duplicate parameter ID defined: ' + paramID);
    }

    if (paramData.resetInterval !== void 0) {
      validateNumericValue.call(this, paramData.resetInterval, paramList, data, function (v) {
        if (v < 0) {
          throw new Error('Parameter reset interval cannot be negative: ' + paramID);
        }
      });
    }

    var distType = paramData.distributionType;
    if (distType && PARAMETER_TYPES.indexOf(distType) === -1) {
      throw new Error('Invalid parameter type: ' + distType + ', for param: ' + paramID);
    }

    var distFn = paramData.distributionFunction;
    var distFnType = typeof distFn;
    if (distFnType === 'string' && easingFunctions[distFn] === void 0) {
      throw new Error('Invalid distribution function: ' + distFn + ', for param: ' + paramID);
    }

    paramList[paramID] = paramData;
  };

  function validateProperty (propData, propKey, paramList, data) {
    validateNumericValue.call(this, propData, paramList, data, null);

    if (typeof propData === 'object') {
      var targets = propData.targets;
      var delta = propData.delta;

      // recursively validate any deltas
      delta && validateProperty.call(this, delta, 'delta', paramList, data);

      // validate animation targets
      if (targets && targets.length) {
        for (var i = 0; i < targets.length; i++) {
          var target = targets[i];

          // validate animation target delay (fraction of particle ttl)
          validateNumericValue.call(this, target.delay, paramList, data, function (v) {
            if (v < 0 || v > 1) {
              throw new Error('Target delay is a fraction of particle ttl (must be between [0, 1]');
            }
          });

          // validate animation target time-to-live (fraction of particle ttl)
          validateNumericValue.call(this, target.duration, paramList, data, function (v) {
            if (v < 0 || v > 1) {
              throw new Error('Target time-to-live is a fraction of particle ttl (must be between [0, 1]');
            }
          });

          // validate against supported easing functions
          var easing = target.easing;
          if (easing && easingFunctions[easing] === void 0) {
            throw new Error('Invalid easing function name: ' + easing);
          }
        }
      }
    }
  };
});



/**
 * Effect Notes
 *  an effect is a group of particles that share the same data definition
 *  most 'particle effects' are created by several of these
 */
var Effect = Class('Effect', function () {
  this.init = function () {
    this.id = '';
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
        // allow user to take control of params via opts.parameterValues
        paramData = mergeParameterOpts.call(this, paramData, opts);
        param.reset(this, paramData);
        this.activeParameters[paramData.id] = param;
      }
    }

    data.count = performance.getAdjustedParticleCount(data.count, opts.performanceScore, opts.allowReduction);

    // support value, range, and params for particle count
    this.count = getNumericValueFromData(this, data.count, 1);

    // emit immediately if not a continuous effect
    if (!this.isContinuous) {
      this.emitParticles();
    }
  };

  function mergeParameterOpts (data, opts) {
    var mergedData = data;
    var paramID = data.id;
    var paramValues = opts.parameterValues;
    var paramValue = paramValues && paramValues[paramID];
    if (paramValue !== void 0) {
      mergedData = merge({}, data);
      var paramValueType = typeof paramValue;
      if (paramValueType === 'number') {
        mergedData.value = paramValue;
        mergedData.distributionType = 'fixed';
      } else if (paramValueType === 'function') {
        mergedData.distributionFunction = paramValue;
        mergedData.distributionType = 'custom';
      }
    }
    return mergedData;
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

  this.finish = function () {
    this.isContinuous = false;
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
var Particle = Class('Particle', function () {
  this.init = function () {
    this.view = new ImageView({ visible: false });
    this.filter = new filter.Filter({});
    this.filterData = { type: '', r: 0, g: 0, b: 0, a: 0 };
    this.currentImageURL = '';
    this.isPolar = false;
    this.hasDeltas = false;
    this.isPaused = false;
    this.effect = null;
    this.elapsed = 0;

    for (var i = 0; i < PROPERTY_KEY_COUNT; i++) {
      // particle properties are never recycled, so ignore the propertyPool
      var key = PROPERTY_KEYS[i];
      var prop = this[key] = new Property();
      // reset on initialize to fully prep the property, i.e. init Animators
      prop.reset(this, key, PROPERTY_DEFAULTS[key]);
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
 *  properties on the root particle are never recycled
 *  properties used as deltas on other properties are always recycled
 */
var Property = Class('Property', function () {
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
    // find the appropriate animate easing function ID
    var easing = target.easing;
    var easingID = animate.linear;
    if (easing && easing in easingFunctions) {
      easingID = animate[easing];
    }
    // prepare an animation object
    var animObj = {};
    animObj[animKey] = getNumericValueFromData(particle.effect, target, 0);
    // append the animation to the chain
    this.animator
      .wait(delay * particle.ttl)
      .then(animObj, duration * particle.ttl, easingID);
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
 *  params represent a distribution over time or particle count from [0, 1]
 *  properties are tied to params via a range of the format: [min, max, paramID]
 *
 *  distributionType:
 *    index - increment the parameter after each particle by 1 / count
 *    time - increment the parameter after each tick by dt / resetInterval
 *    indexOverTime - combine index and time above
 *    random - the parameter has a random value for each particle emitted
 *    fixed - the param is overridden to a fixed value
 *    custom - the param value is given by a custom function
 *
 *  distributionFunction:
 *    apply timestep animate easing functions to the parameter's value,
 *    can also be a custom function
 *
 *  reverseReset:
 *    instead of resetting to 0, the parameter changes directions towards 0
 *      and then back again, towards 1, etc.
 */
var Parameter = Class('Parameter', function () {
  this.init = function () {
    this.id = '';
    this.value = 0;
    this.resetInterval = 16;
    this.resetDirection = 1;
    this.reverseReset = false;
    this.distributionType = 'indexOverTime';
    this.distributionFunction = easingFunctions['linear'];
    // ObjectPool book-keeping
    this._poolIndex = 0;
    this._obtainedFromPool = false;
  };

  this.reset = function (effect, data) {
    this.id = '' + data.id;
    this.value = data.value || 0;
    this.resetInterval = data.resetInterval || 16;
    this.resetDirection = 1;
    this.reverseReset = data.reverseReset || false;
    this.distributionType = data.distributionType || 'indexOverTime';
    this.distributionFunction = easingFunctions['linear'];

    // find the appropriate animate easing function
    var distFn = data.distributionFunction;
    var distFnType = typeof distFn;
    if (distFnType === 'string' && distFn in easingFunctions) {
      this.distributionFunction = easingFunctions[distFn];
    } else if (distFnType === 'function') {
      this.distributionFunction = distFn;
    }

    this.update(0, false);
  };

  this.recycle = function () {
    parameterPool.release(this);
  };

  this.update = function (value, fromEmission) {
    var type = this.distributionType;
    switch (type) {
      // fixed and custom type parameters never update
      case 'fixed':
      case 'custom':
        break;

      // random parameters are updated after each particle with a new value
      case 'random':
        this.value = random();
        break;

      // non-random parameters increment over index, time, or both
      case 'index':
      case 'time':
      case 'indexOverTime':
        // time type parameters ignore particle index updates
        if (fromEmission && type === 'time') {
          break;
        }

        value = this.value + this.resetDirection * value;
        if (this.reverseReset) {
          while (value > 1 || value < 0) {
            // the direction the parameter should move
            this.resetDirection *= -1;
            // instead of simply % 1, we have to carry the remainder backwards
            if (value > 1) {
              value = 1 - (value - 1);
            } else {
              value *= -1;
            }
          }
          // here, value is guaranteed between 0 and 1, inclusive
          this.value = value;
        } else {
          // by default, the value resets to 0 when it exceeds 1
          this.value = value % 1;
        }
        break;
    }
  };

  // only continuous effects step their parameters
  this.step = function (dt) {
    var type = this.distributionType;
    if (type === 'time' || type === 'indexOverTime') {
      this.update(dt / this.resetInterval, false);
    }
  };

  this.getValueBetween = function (minVal, maxVal) {
    var diff = maxVal - minVal;
    return minVal + diff * this.distributionFunction(this.value);
  };
});



/**
 * Numeric Value Notes
 *  all numbers in this engine can be a single value or a range of values
 *    ranges represent a random or parameterized distribution of values
 *      they come in 2 valid formats
 *        [min, max] - a random float between min and max
 *        [min, max, paramID] - a parameterized float between min and max
 */
function getNumericValueFromData (effect, data, defaultValue) {
  var value = defaultValue;
  var dataType = typeof data;
  if (dataType === 'object') {
    var range = data.range;
    if (range && range.length >= 2) {
      var minVal = range[0];
      var maxVal = range[1];
      var param = null;
      if (range.length === 3) {
        var paramID = range[2];
        param = effect.activeParameters[paramID];
      }
      if (param) {
        // set value based on a parameterized range
        value = param.getValueBetween(minVal, maxVal);
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
var parameterPool = new ObjectPool({ ctor: Parameter });
var propertyPool = new ObjectPool({ ctor: Property });
var particlePool = new ObjectPool({ ctor: Particle });
var effectPool = new ObjectPool({ ctor: Effect });
exports = new EffectsEngine();
