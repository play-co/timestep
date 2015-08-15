/* globals DEBUG */

/*
 * opts:
 *  - value: value to check
 *  - allowNull: if true and required, value can be null, else nulls for
 *    required values are errors
 *  - required: if true, error if value is undefined/null (see allowNull)
 */
if (DEBUG) {
  var isNumber = function (val) { return typeof val == 'number' && !isNaN(val); };
  var VALIDATORS = {
    'string': function (val) { return typeof val == 'string'; },
    'integer': function (val) { return isNumber(val) && Math.floor(val) == val; },
    'number': isNumber,
    'float': isNumber,
    'array': Array.isArray,
    'object': function (val) { return typeof val == 'object'; },
    'key': function (key, opts) {
      if (opts.toLowerCase) {
        return (key.toLowerCase && key.toLowerCase()) in lowerCaseKeys(opts.dictionary);
      } else {
        return opts.dictionary && (key in opts.dictionary);
      }
    }
  };

  var ERRORS = {
    'default': function (scope, name, opts) {
      return scope + ' "' + name + '" should be a ' + opts.type;
    },
    'key': function (scope, name, opts) {
      return scope + ' "' + name + '" should be a key from the set: '
        + Object
            .keys(opts.toLowerCase
              ? lowerCaseKeys(opts.dictionary)
              : opts.dictionary)
            .join(', ');
    }
  };

  var lowerCaseKeys = function (obj) {
    var keys = {};
    if (obj) {
      for (var k in obj) {
        keys[k.toLowerCase()] = true;
      }
    }
    return keys;
  };

  var getError = function (scope, name, opts) {
    var msg = (ERRORS[opts.type] || ERRORS['default'])(scope, name, opts);
    return new TypeError(msg);
  };

  exports.check = function (scope, properties) {
    if (DEBUG) {
      Object.keys(properties).forEach(function (name) {
        var opts = properties[name];
        if (opts.required && opts.value === undefined || opts.value === null && !opts.allowNull) {
          logger.error(new TypeError(scope + ' "' + name + '" required'));
        } else if (opts.type in VALIDATORS) {
          if (!VALIDATORS[opts.type](opts.value, opts)) {
            logger.error(getError(scope, name, opts));
          }
        }
      });
    }
  };
} else {
  // production, no checking
  exports.check = function () {};
}
