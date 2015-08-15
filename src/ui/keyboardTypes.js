import device;

// map input types to native constants
exports.nativeTypes = {
    // legacy native names
    Default: 0,                // Default type for the current input method.
    NumbersAndPunctuation: 2,  // Numbers and assorted punctuation.
    URL: 3,                    // A type optimized for URL entry (shows . / .com prominently).
    NumberPad: 4,              // A number pad (0-9). Suitable for PIN entry.
    PhonePad: 5,               // A phone pad (1-9, *, 0, #, with letters under the numbers).
    EmailAddress: 7,           // A type optimized for multiple email address entry (shows space @ . prominently).
    DecimalPad: 8,

    // html5 names
    url: 3,
    number: device.isIOS ? 2 : 4, // ios/android mobile are different
    tel: 5,
    email: 7,
  };

// map input types to html5 type names
exports.htmlTypes = {
    // legacy native mapping
    Default: 'text',
    NumbersAndPunctuation: 'number', // note: android won't show punctuation
    URL: 'url',
    NumberPad: 'number',
    PhonePad: 'tel',
    EmailAddress: 'email',
    DecimalPad: 'number',

    // html5 types supported on both native/browser
    number: 'number',
    url: 'url',
    tel: 'tel',
    email: 'email',

    // html5 types only supported in the browser
    // TODO: add to native
    date: 'date',
    time: 'time',
    datetime: 'datetime',
    month: 'month'
  };

exports.types = {};

for (var type in exports.nativeTypes) {
  exports.types[type.toLowerCase()] = exports.nativeTypes[type];
}

for (var type in exports.htmlTypes) {
  exports.htmlTypes[type.toLowerCase()] = exports.htmlTypes[type];
}

exports.has = function (type) {
  return type.toLowerCase() in exports.types;
};

exports.getNativeType = function (type) {
  return exports.types[type.toLowerCase()] || 0;
};

exports.getHTMLType = function (type) {
  return exports.htmlTypes[type.toLowerCase()] || type;
};
