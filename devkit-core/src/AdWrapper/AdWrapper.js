import { CONFIG, merge } from 'base';
import { adServerAnalytics } from 'analytics'
import facebook from 'facebook';
import GCXPromotionAd from './GCXPromotion';
import FBAd from './FBAds';
import { logger } from 'base';
import { fetchAdConfig } from './http'


export const SOURCE_PRELOADING = 'preloading';
export const MAX_PRELOADED_INSTANCES = 3; // FB limitation
export const DEFAULT_RETRY_COUNT = 2;

export const AD_NETWORK_FB = 'fan'; // facebook
export const AD_NETWORK_GC = 'gcn'  // game closure

export const AD_TYPE_VIDEO = 'video';
export const AD_TYPE_INTERSTITIAL = 'interstitial';
export const AD_TYPE_EVENT = 'event';

export const AD_INCENTIVE_VIEW = 'view';
export const AD_INCENTIVE_CONVERSION_SUPPLY = 'conversionSupply';

export const AD_MEDIA_IMG = 'image';
export const AD_MEDIA_VIDEO = 'video';
export const AD_MEDIA_GAME = 'minigame';

export const AD_NETWORKS = {
  facebook: AD_NETWORK_FB,
  gc: AD_NETWORK_GC,
  all: [AD_NETWORK_FB, AD_NETWORK_GC]
};

export default class AdWrapper {
  constructor (placementIDs, xPromote = true, promotionPayload = {}, userCountryCode = '') {
    // have we loaded config etc.
    this.initialized = false;
    this.config = {
      disabled: false,
      gcnRatio: 0,
      networks: [AD_NETWORK_GC, AD_NETWORK_FB]
    }
    // does config say dont serve ads right now
    this.appID = process.env.FB_APP_ID;     // fb appID - from env var
    this.gameID = CONFIG.shortName;         // internal app name - eg. `tsumtsum-dev` CONFIG.shortName from package.json
    logger.log('this.gameID:', this.gameID);
    this.placementIDs = placementIDs; // fb - move
    this.availablePlacementIDs = placementIDs.slice(0);
    this.adInstances = [];
    this.preloadCount = 0;
    this.xPromote = xPromote;
    this.promotionPayload = promotionPayload;
    this.userCountryCode = userCountryCode;
    logger.log('userCountryCode:', this.userCountryCode);
    // tracking views locally and per session only
    // at some point we want to store this in a db on a per user basis
    // for now we do the ghetto implementation to at least cap the view per
    // session so that users cannot just eg max out their fairy in everwing
    // ex:
    // this.viewCounts['id_1'] = {views:1,max:3};
    this.viewCounts = {};
  }

  init() {
    if (this.initialized === true) {
      return Promise.resolve();
    }
    return fetchAdConfig().then((conf) => {
      this.parseConfig(conf);
      this.initialized = true;
      return this.doFullPreload()
        .catch((e) => {
          logger.log('error preloading retrying once: ', e.message);
          return this.doFullPreload()
            .catch((e) => {
              // we dont reject this case - could be a network problem to preload
              // might work with direct download later
              logger.log('error preloading retrying once: ', e.message);
            });
        });
    })
    .catch((e) => {
      // we reject if we cannot get a config
      logger.error('Could not retrieve adserver config:' + e);
      logger.warn('will disable ad wrapper');
      this.initialized = false;
      this.config.disabled = true;
    });
  }

  parseConfig(conf) {
    try {
      if (conf.disabled !== undefined) {
        this.config.disabled = conf.disabled;
      }
      if (conf.gcnRatio !== undefined && conf.gcnRatio >= 0 && conf.gcnRatio <= 1) {
        this.config.gcnRatio = conf.gcnRatio;
      }
      if (conf.networks !== undefined) {
        for (var i = 0; i < networks.length; i++) {
          if (AD_NETWORKS.all.indexOf(networks[i]) === -1) {
            throw new Error('unknown ad network ' + networks[i]);
          }
        }
        this.config.networks = conf.networks;
      }
    }
    catch (e) {
      logger.log('Error parsing remote config:', e);
    }
    logger.log('### using config:', JSON.stringify(this.config));
  }

  doFullPreload () {
    /*
    put in some intervals fb fails if you call too fast - we should start to have
    more sophisticated logic to always aim at 3 preloaded instances and not run
    preloads concurrently in the future
    */
    return this.preloadAd()
        .catch((e) => {
          logger.log('error preloading 1: ' + e.message);
          throw(e);
        }).then(() => {
          setTimeout(() => {
            return this.preloadAd()
              .catch((e) => {
                logger.log('error preloading 2: ' + e.message);
              });
          }, 10000);
        });
  }

  preloadAd (params = {}) {
    if (this.initialized !== true) {
      return Promise.reject(new Error('AdWrapper is not properly initialized.'));
    }

    if (this.config.disabled === true) {
      return Promise.reject(new Error('Ad Wrapper is disabled'));
    }

    if (this.adInstances.length >= MAX_PRELOADED_INSTANCES) {
      logger.error('Already have 3 preloaded ad instances. use those first.');
      return Promise.reject(new Error('Already have 3 preloaded ad instances. use those first.'));
    }

    var triesLeft = (params.triesLeft === undefined) ? DEFAULT_RETRY_COUNT : params.triesLeft;
    if (triesLeft < 1) {
      logger.error('failed to preload ad: no tries left');
      return Promise.reject(new Error('failed to preload ad: no tries left'));
    }

    var adNetwork = params.adNetwork || (Math.random() <= this.config.gcnRatio) ? AD_NETWORK_GC: AD_NETWORK_FB;
    var isDirectShow = params.isDirectShow || false;
    /*
      NB: adNetwork = AD_NETWORK_FB is a current time default that we use to
      also determine a couple of other parameters that are currently implicit, but
      we want to already log them.
    */

    // set currently implicit parameters
    // all of this gets thrown into Amplitude
    var adParams = {}
    if (adNetwork === AD_NETWORK_FB) {
      adParams = {
        appID: this.appID,
        gameID: this.gameID,
        targetAppID: 'not_set',      // N/A here
        targetGameID: 'not_set',     // N/A here
        adNetwork: adNetwork,
        adType: AD_TYPE_VIDEO,
        adIncentive: AD_INCENTIVE_VIEW,
        adMedia: AD_MEDIA_VIDEO,
        UID: 'not_set',       // N/A here
        asset: 'not_set',     // N/A here
        text: 'not_set',      // N/A here
        button: 'not_set'     // N/A here
      };
    } else if (adNetwork === AD_NETWORK_GC) {
      adParams = {
        appID: this.appID,    // the running game
        gameID: this.gameID,  // the running game
        targetAppID: 'not_set',      // the game we are x promoting *to* - part if the adconfig
        targetGameID: 'not_set',     // the game we are x promoting *to* - part if the adconfig
        adNetwork: AD_NETWORK_GC,
        adType: AD_TYPE_INTERSTITIAL,
        adIncentive: AD_INCENTIVE_CONVERSION_SUPPLY,
        adMedia: AD_MEDIA_IMG,
        UID: 'not_set',      // UID for the ad
        asset: 'not_set',    // identifier for the asset
        text: 'not_set',     // identifier for the text - not the full text
        button: 'not_set'    // identifier for the button text - not the full text
      };
    }

    var startTimeRequest = Date.now();

    // report that we're requesting an ad
    adServerAnalytics.pushEvent('AdRequest', merge(
      adParams, {
        isRetry: (triesLeft === DEFAULT_RETRY_COUNT) ? false : true,
        isDirectShow: isDirectShow
      }), { postToDefaultProject: true });

    var instance = null;
    if (adNetwork === AD_NETWORK_FB) {
      instance = new FBAd(this.placementIDs, adParams);
    } else if (adNetwork === AD_NETWORK_GC) {
      instance = new GCXPromotionAd(this.promotionPayload, adParams);
    }

    var preloadParams = {
      triesLeft: triesLeft,
      startTimeRequest: startTimeRequest
    };

    return instance.preloadAd(preloadParams)
      .then((instance) => {
        if (adNetwork === AD_NETWORK_GC) {
          logger.log("### noShowCountries userCountryCode ", instance.noShowCountries, this.userCountryCode);
          if (instance.noShowCountries.indexOf(this.userCountryCode) != -1) {
            throw new Error('no show for userCountryCode ' + this.userCountryCode + ' ' + instance.noShowCountries);
          }
          // set view limit
          if (this.viewCounts[instance.adID] === undefined) {
            this.viewCounts[instance.adID] = {
              views:0,
              max:instance.maxShow
            };
          }
          // ditch the ad if we already hit the max view count
          if (this.viewCounts[instance.adID].views+1 > this.viewCounts[instance.adID].max) {
            throw new Error('max show per session');
          }
        }

        this.adInstances.push(instance);
        logger.log('pushed ad instance', this.adInstances.length, instance);
        return Promise.resolve();
      })
      .catch((e) => {
        // try again in a moment or xPromote
        if (this.xPromote === true && adNetwork !== AD_NETWORK_GC) {
          adNetwork = AD_NETWORK_GC;
        }

        return new Promise((resolve) => {
          var retryTimeout = (this.xPromote !== true) ? 1000: 1;
          setTimeout(() => resolve(this.preloadAd({
            adNetwork: adNetwork,
            triesLeft: triesLeft - 1
          })), retryTimeout);
        });
      });
  }

  showPreloadedAd (source, triesLeft = DEFAULT_RETRY_COUNT) {
    if (triesLeft < 1) {
      var msg = 'no more retries to show ad.';
      logger.error(msg);

      var e = new Error(msg);
      adServerAnalytics.pushError('AdShowFailed', e, merge(adParams, {
        elapsed: 0,
        elapsedSinceRequest: 0,
        gameFeature: source
      }), { postToDefaultProject: true });

      return Promise.reject(e);
    }

    var preloadPromise = Promise.resolve();
    var isPreloaded = true;
    if (this.adInstances.length < 1) {
      preloadPromise = this.preloadAd({
        triesLeft:DEFAULT_RETRY_COUNT,
        isDirectShow: true
      });
      isPreloaded = false;
    }

    var instance = {};

    return preloadPromise
      .then(() => {
        instance = this.adInstances.shift();

        // check view count limit
        if (instance.adNetwork === AD_NETWORK_GC) {
          if (this.viewCounts[instance.adID].views+1 > this.viewCounts[instance.adID].max) {
            var e = new Error('max show per session');
            adServerAnalytics.pushError('AdShowFailed', e, merge(instance.adParams, {
              elapsed: Date.now() - instance.startTimeShow,
              elapsedSinceRequest: Date.now() - instance.startTimeRequest,
              gameFeature: source,
              isPreloaded: isPreloaded
            }), { postToDefaultProject: true });

            throw e;
          }

          this.viewCounts[instance.adID].views++;
        }

        return instance.showAd(source, triesLeft, isPreloaded)
          .then(() => {
            /*
              this is a guess. we dont know how an adinstance get's marked as
              used or played. this happens in some async fashion on the fb
              side - but it's not documented anywhere. 500ms might very well
              be too short (for apreloading slot to open again)
            */
            setTimeout(() => this.preloadAd(), 1000);
            return Promise.resolve();
          });
      })
      .catch((e) => {
        logger.error('failed to load/show ad - not retrying again: ' + e.message);

        adServerAnalytics.pushError('AdShowFailed', e, merge(instance.adParams, {
          elapsed: Date.now() - instance.startTimeShow,
          elapsedSinceRequest: Date.now() - instance.startTimeRequest,
          gameFeature: source,
          isPreloaded: isPreloaded
        }), { postToDefaultProject: true });

        // do this here too?
        if (this.xPromote === true && adNetwork !== AD_NETWORK_GC) {
          adNetwork = AD_NETWORK_GC;
        }

        // return new Promise((resolve) => {
        // var retryTimeout = (this.xPromote !== true) ? 1000: 1;
        // setTimeout(() => resolve(this.preloadAd({
        this.preloadAd({
          adNetwork: adNetwork,
          triesLeft: (triesLeft - 1)
        });
        // })), retryTimeout);
        // });
      });
  }

}
