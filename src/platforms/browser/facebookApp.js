let exports = {};

import {
  logger,
  bind
} from 'base';

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
import chromeFrame from './chromeFrame';

var withFacebook = new Callback();
var _appID;

exports.withFacebook = function () {
  withFacebook.forward(arguments);
};

exports.init = function (appID) {
  if (!chromeFrame.isChromeFrame()) {
    logger.log('Initializing Facebook canvas app with ID:', appID);
    _appID = appID;
    window.fbAsyncInit = bind(this, '_onLoad', appID);
    var fbRoot = document.createElement('div');
    fbRoot.id = 'fb-root';
    fbRoot.style.cssText =
      'position:absolute;left:-10px;top:-10px;width:1px;height:1px;';
    document.body.appendChild(fbRoot);
    var el = document.createElement('script');
    el.src = document.location.protocol +
      '//connect.facebook.net/en_US/all.js';
    el.async = true;
    document.body.appendChild(el);
  }
};

exports._onLoad = function (appID) {
  FB.init({
    appId: appID,
    status: true,
    cookie: true,
    xfbml: false,
    channelUrl: window.location.protocol + '//' + window.location.hostname +
      '/facebook_channel.html',
    oauth: true
  });
  withFacebook.fire();
};

/**
 * The difference between challenge and invite, is that with challenge
 * we know ahead of time which user we are challenging, whereas with invite
 * the user is selecting which friend to invite in the dialog
 */
exports.inviteFriends = function (opts, cb) {
  if (chromeFrame.isChromeFrame()) {
    this.sendChromeFrameMessage('inviteFriends', opts, cb);
    return;
  }

  FB.ui({
    method: 'apprequests',
    message: opts.message,
    data: opts.code,
    display: 'iframe'
  }, function (response) {
    if (!response) {
      cb({
        msg: 'Challenge friend cancelled.',
        fb_cancel: true
      });
    } else if (response.error_msg) {
      cb({ msg: response.error_msg });
    } else {
      cb(null, {
        success: true,
        details: response
      });
    }
  });
};

exports.challengeFriend = function (opts, cb) {
  if (!opts || !opts.code) {
    logger.log('Missing data to send request', opts);
    return;
  }

  if (chromeFrame.isChromeFrame()) {
    this.sendChromeFrameMessage('challengeFriend', opts, cb);
    return;
  }

  // if no FB user id specified, use invite dialog instead of challenge
  if (!opts.user || !opts.user.user || !opts.user.user.facebook || !opts.user
    .user.facebook.id) {
    this.inviteFriends(opts, cb);
  } else {
    FB.ui({
      method: 'apprequests',
      to: opts.user.user.facebook.id,
      message: opts.message,
      data: opts.code,
      display: 'iframe'
    }, function (response) {
      if (response) {
        cb(null, {
          success: true,
          details: response
        });
      } else {
        cb({
          msg: 'Challenge friend cancelled.',
          fb_cancel: true
        });
      }
    });
  }
};

exports.buyWeeCoins = function (opts, cb) {
  if (chromeFrame.isChromeFrame()) {
    this.sendChromeFrameMessage('buyWeeCoins', opts, cb);
    return;
  }

  FB.ui({
    method: 'pay',
    display: 'iframe',
    order_info: opts.price + '|' + opts.amount,
    purchase_type: 'item'
  }, function (response) {
    if (response && response.order_id) {
      cb(null, {
        success: true,
        details: response
      });
    } else if (response && response.error_message) {
      cb({ msg: response.error_message });
    } else {
      cb({ msg: 'Unknown Error' });
    }
  });
};

exports.sendChromeFrameMessage = function (method, data, cb) {
  if (!chromeFrame.isChromeFrame()) {
    logger.log(
      'Cannot invoke send chrome frame message without chrome frame object'
    );
    return;
  }

  if (!data) {
    data = {};
  }
  data._method = method;

  chromeFrame.send('facebookApp', data, cb);
};

exports.receiveChromeFrameMessage = function (data, cb) {
  if (!data) {
    logger.log('No data recieved from chrome frame from Facebook send');
    cb();
    return;
  } else if (!data._method) {
    logger.log(
      'No method specified in data from chrome frame from Facebook send');
    cb();
    return;
  }

  switch (data._method) {
    case 'inviteFriends':
      this.inviteFriends(data, cb);
      break;
    case 'challengeFriend':
      this.challengeFriend(data, cb);
      break;
    case 'buyWeeCoins':
      this.buyWeeCoins(data, cb);
      break;
    default:
      logger.log(
      'Unrecognized method specified in data from chrome frame from Facebook send'
    );
  }
};

export default exports;
