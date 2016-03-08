var ua = navigator && navigator.userAgent;
exports.ua = ua; //for debug: delete later

//Determine runtime
var isNative = /TeaLeaf/.test(ua);
exports.APP_RUNTIME = isNative ? 'native' : 'browser';

var isIOS = /iPod|iPhone|iPad/i.test(ua);
var isAndroid = /Android/.test(ua);


//Determine runtime and device type.
if (isNative) {
  exports.APP_RUNTIME = 'native';
  exports.DEVICE_TYPE = 'mobile';
} else {
  exports.APP_RUNTIME = 'browser';
  if (isIOS || isAndroid) {
    exports.DEVICE_TYPE = 'mobile';
  } else {
    exports.DEVICE_TYPE = 'desktop';
  }
}

//Determine OS type.
var isMac = /Mac OS X [0-9_]+/.test(ua);
var isIPhoneOS = /iPhone OS/.test(ua);
var osType = 'unknown';

if (isAndroid) {
  osType = 'Android';
} else if (isIPhoneOS) {
  osType = 'iOS';
} else if (isMac) {
  osType = 'Mac OS X'
} 
exports.OS_TYPE = osType;


var isSimulator = GLOBAL.CONFIG && !!CONFIG.simulator;
exports.SIMULATED = isSimulator;



// This is the desired API
//exports.APP_RUNTIME = "browser" or "mobile";
//exports.DEVICE_TYPE = "mobile" or "desktop";
//exports.OS_TYPE = "iOS" or "Android" or ...
//exports.SIMULATED = true or false
