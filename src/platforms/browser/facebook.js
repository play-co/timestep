let exports = {};

import { bind } from 'base';

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
'use import';

import Callback from 'lib/Callback';

var TIMEOUT = 15000;
var _load = new Callback();
var withSession = new Callback();
var withAppID = new Callback();

exports.state = 'initial';
exports.onLoad = function () {
  _load.forward(arguments);
};
exports.onSession = function () {
  withSession.forward(arguments);
};
exports.load = function (cb) {
  switch (exports.state) {
    case 'completed':
    case 'loading':
      _load.run(cb);
      return;
    case 'failed':
    // try again
      if (_load.fired()) {
        _load.reset();
      }
      break;
    default:
      break;
  }

  // setup a timeout
  var timeout = setTimeout(bind(this._load, 'fire', 'timeout'), TIMEOUT);
  _load.run(window, clearTimeout, timeout);
  _load.run(getSession);
  _load.run(cb);

  exports.state = 'loading';
  doLoad();
};

exports.setAppID = function (appID) {
  if (withAppID.fired) {
    withAppID.reset();
  }
  withAppID.fire(appID);
};

function doLoad () {
  window.fbAsyncInit = function () {
    if (!window.FB) {
      _load.fire('failed');
    } else {
      _load.fire(null);
    }
  };

  var el;

  el = document.body.appendChild(document.createElement('div'));
  el.id = 'fb-root';
  el.style.cssText =
    'position:absolute;left:-10px;top:-10px;width:1px;height:1px;visibility:hidden';

  el = document.createElement('script');
  el.onerror = function () {
    _load.fire('download_error');
  };
  el.src = '//connect.facebook.net/en_US/all.js';
  document.getElementsByTagName('head')[0].appendChild(el);
}

function getSession (err) {
  if (err) {
    exports.state = 'failed';
    return GC.error('facebook', 'load_failed');
  }

  exports.state = 'completed';

  withAppID.run(function (appID) {
    FB.init({
      appId: appID,
      status: true,
      // check login status
      cookie: true,
      // enable cookies to allow the server to access the session
      xfbml: false
    });

    // parse XFBML
    GC.user.sync(function (err, details) {
      var fbAccount = details && details.accounts.facebook;
      if (!fbAccount) {
        GC.error('facebook', 'error', 'noAccount?');
        withSession.fire('noAccount?');
        return;
      }

      if (fbAccount.hasAccessToken) {
        withSession.fire(null);
        return;
      }

      FB.getLoginStatus(function (response) {
        if (response.session) {
          GC.track({
            name: 'facebook',
            category: 'getLoginStatus',
            subcategory: 'hasSession'
          });
          var conn = GC.getConnection();
          conn.sendFbSessionDetails(response.session);
          withSession.fire(null);
        } else {
          GC.track({
            name: 'facebook',
            category: 'getLoginStatus',
            subcategory: 'noSession',
            data: response
          });
          withSession.fire('noSession');
        }
      });
    });
  });
}

export default exports;
