var backendCanvasCtx = require.context('./ui/backend/canvas', true, /^.*\.js$/);
// var backendDomCtx = require.context('./ui/backend/dom', true, /^.*\.js$/);
var platformBrowserCtx = require.context('./platforms/browser', true, /^.*\.js$/);


var getDynamicModulePath = function (module) {
  var moduleName = module.replace(/\./g, '/');
  if (moduleName.indexOf('./') !== 0) {
    moduleName = './' + moduleName;
  }
  if (moduleName.indexOf('.js') !== moduleName.length - 3) {
    moduleName += '.js';
  }
  return moduleName;
};


var getModule = (req, modulePath) => {
  const result = req(modulePath);
  if (!result) {
    return result;
  }

  // es6 module compatibility
  if (result.__esModule && result.default) {
    return result.default;
  }

  return result;
};


export const getImport = function (module) {
  // deprecated: InputPrompt used to be platform-specific
  if (module === 'InputPrompt') {
    let InputPrompt = require('ui/InputPrompt');
    return InputPrompt;
  }

  // var path = _devices[exports.name] || 'platforms.browser';
  // return jsio('import ' + path + '.' + module, {
  //   dontExport: true,
  //   suppressErrors: true
  // });
  return getModule(platformBrowserCtx, getDynamicModulePath(module));
};


export const importUI = function (module) {
  // var domOrCanvas = exports.useDOM ? 'dom' : 'canvas';
  // var importString = 'import ui.backend.' + domOrCanvas + '.' + module;
  // var importOpts = {dontExport: true, suppressErrors: true};
  // return jsio(importString, importOpts);
  var req;
  if (exports.useDOM) {
    // req = backendDomCtx;
    throw new Error('dom ctx unavailable');
  } else {
    req = backendCanvasCtx;
  }
  return getModule(req, getDynamicModulePath(module));
};
