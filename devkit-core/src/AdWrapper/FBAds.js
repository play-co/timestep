import { CONFIG, merge } from 'base';
import { adServerAnalytics } from 'analytics'
import facebook from 'facebook';
import { logger } from 'base';
import {DEFAULT_RETRY_COUNT, AD_NETWORK_FB, AD_NETWORK_GC, AD_TYPE_VIDEO, AD_TYPE_INTERSTITIAL, AD_TYPE_EVENT, AD_INCENTIVE_VIEW, AD_INCENTIVE_CONVERSION_SUPPLY, AD_MEDIA_IMG, AD_MEDIA_VIDEO, AD_MEDIA_GAME} from './AdWrapper'

export default class FBAd {
  constructor (placementIDs, adParams) {
    this.appID = process.env.FB_APP_ID;     // fb appID - from env var
    this.gameID = CONFIG.shortName;         // internal app name - eg. `tsumtsum-dev` CONFIG.shortName from package.json
    this.adNetwork = AD_NETWORK_FB;
    this.placementIDs = placementIDs;
    this.adID = '';
    this.availablePlacementIDs = placementIDs.slice(0);
    this.instance = {};
    this.startTimeRequest = 0;
    this.adParams = adParams;
  }

  getPlacementID () {
    // use each placementID once, and when we run out, reset the list
    var ids = this.availablePlacementIDs;
    if (ids.length === 0) {
      ids = this.availablePlacementIDs = this.placementIDs.slice(0);
    }

    // splice a single placementID from our list of available ids
    var index = Math.floor(Math.random() * ids.length);
    var spliced = ids.splice(index, 1);
    return spliced[0];
  }

  preloadAd (params = {}) {
    var triesLeft = params.triesLeft || DEFAULT_RETRY_COUNT;
    var isDirectShow = params.isDirectShow || false;
    this.startTimeRequest = params.startTimeRequest || Date.now();

    // use one from the pool
    this.usedplacementID = this.getPlacementID();
    this.adID = AD_NETWORK_FB+'_'+this.usedplacementID;

    var startTimeLoad = 0;

    return facebook.getRewardedVideoAsync(this.usedplacementID)
      .catch((e) => {
        adServerAnalytics.pushError('AdRequestFailed', e, merge(this.adParams, {
          elapsed: Date.now() - this.startTimeRequest,
          isDirectShow: isDirectShow
        }), { postToDefaultProject: true });

        // triggers the delayed retry in the last catch
        throw e;
      })
      .then((ad) => {
        adServerAnalytics.pushEvent('AdRequestSuccess', merge(this.adParams, {
          elapsed: Date.now() - this.startTimeRequest,
          isDirectShow: isDirectShow
        }), { postToDefaultProject: true });

        startTimeLoad = Date.now();
        return ad.loadAsync()
          .then(() => ad)
          .catch((e) => {
            adServerAnalytics.pushError('AdLoadFailed', e, merge(this.adParams, {
              elapsed: Date.now() - startTimeLoad,
              elapsedSinceRequest: Date.now() - this.startTimeRequest,
              isDirectShow: isDirectShow
            }), { postToDefaultProject: true });

            // if load fails we retry from requesting an ad again
            // rethrow and then retry via last catch block if retries are left
            throw e;
          });
        })
      .then((ad) => {
        adServerAnalytics.pushEvent('AdLoadSuccess', merge(this.adParams, {
          elapsed: Date.now() - startTimeLoad,
          elapsedSinceRequest: Date.now() - this.startTimeRequest,
          isDirectShow: isDirectShow
        }), { postToDefaultProject: true });

        logger.log('ad preloaded');

        this.instance = ad;
      })
      .return(this)
      .catch((e) => {
        throw e;
      });
  }

  // showAd (source, triesLeft = DEFAULT_RETRY_COUNT, hadPreloadedInstance) {
  showAd (source, triesLeft = DEFAULT_RETRY_COUNT, isPreloaded) {
    return new Promise((resolve, reject) => {
      this.startTimeShow = Date.now();

      adServerAnalytics.pushEvent('AdShow', merge(this.adParams, {
        elapsed: 0,
        elapsedSinceRequest: Date.now() - this.startTimeRequest,
        gameFeature: source,
        isPreloaded: isPreloaded
      }), { postToDefaultProject: true });

      this.instance.showAsync()
        .then(() => {
          adServerAnalytics.pushEvent('AdShowSuccess', merge(this.adParams, {
            elapsed: Date.now() - this.startTimeShow,
            elapsedSinceRequest: Date.now() - this.startTimeRequest,
            gameFeature: source,
            isPreloaded: isPreloaded
          }), { postToDefaultProject: true });

          resolve();
        })
        .catch((e) => {
          adServerAnalytics.pushError('AdShowFailed', e, merge(this.adParams, {
            elapsed: Date.now() - this.startTimeShow,
            elapsedSinceRequest: Date.now() - this.startTimeRequest,
            gameFeature: source,
            isPreloaded: isPreloaded
          }), { postToDefaultProject: true });

          throw e;
        });
      })
      .catch((e) => {
        logger.error('failed to load ad - not retrying again: ' + e.message);

        adServerAnalytics.pushError('AdShowFailed', e, merge(this.adParams, {
          elapsed: Date.now() - this.startTimeShow,
          elapsedSinceRequest: Date.now() - this.startTimeRequest,
          gameFeature: source,
          isPreloaded: isPreloaded
        }), { postToDefaultProject: true });

        throw e;
      });
  }

}
