import { adServerAnalytics } from 'analytics'
import { merge } from 'base';
import GCXPromotionAdView from './GCXPromotionView';
import { logger } from 'base';
import { DEFAULT_RETRY_COUNT, AD_NETWORK_GC } from './AdWrapper'
import { fetchAdData } from './http'
import facebook from 'facebook';

export const DEFAULT_MAXSHOW_XPROMO_ADS = 3;

function deepCopy(o) {
  return JSON.parse(JSON.stringify(o));
}

export default class GCXPromotionAd {
  constructor (payload = {}, analyticsParams = {}, appID = '') {
    this.appID = appID;
    this.adNetwork = AD_NETWORK_GC;
    this.adID = "";
    this.payload = payload; // the payload to switch the game
    this.instance = {};
    this.startTimeRequest = 0;
    this.noShowCountries = [];
    this.maxShow = DEFAULT_MAXSHOW_XPROMO_ADS;
    this.analyticsParams = analyticsParams;
  }

  analyticsParameters() {
    return deepCopy(this.analyticsParams);
  }

  preloadAd (params = {}) {
    var triesLeft = (params.triesLeft === undefined) ? DEFAULT_RETRY_COUNT : params.triesLeft;
    var isDirectShow = params.isDirectShow || false;
    var isRetry = params.isRetry || false;
    var startTime = params.startTimeRequest || Date.now();
    this.startTimeRequest = startTime;
    if (triesLeft < 1) {
      logger.error('failed to preload GCXPromotion ad: no tries left');
      return Promise.reject('failed to preload GCXPromotion ad: no tries left');
    }

    logger.log('get xpromo ad data');
    var startTimeLoad;

    return fetchAdData()
      .catch((e) => {
        logger.error('AdRequestFailed ' + e);

        adServerAnalytics.pushError('AdRequestFailed', e, merge(this.analyticsParameters(), {
          elapsed: Date.now() - this.startTimeRequest,
          isRetry: (!isRetry && triesLeft === DEFAULT_RETRY_COUNT) ? false : true,
          isDirectShow: isDirectShow
        }), { postToDefaultProject: true });

        // triggers the delayed retry in the last catch
        throw e;
      })
        .then((adData) => {
          this.noShowCountries = this.noShowCountries.concat(adData.noShowCountries || []);
          this.maxShow = adData.maxShow || DEFAULT_MAXSHOW_XPROMO_ADS;
          this.adID = adData.id || this.analyticsParams.UID

          this.analyticsParams.UID = adData.id || this.analyticsParams.UID;
          this.analyticsParams.targetAppID = adData.appID || this.analyticsParams.targetAppID;
          this.analyticsParams.targetGameID = adData.gameID || this.analyticsParams.targetGameID;
          this.analyticsParams.asset = adData.assetID || this.analyticsParams.asset;
          this.analyticsParams.text = adData.textID || this.analyticsParams.text;
          this.analyticsParams.button = adData.buttonID || this.analyticsParams.button;

          // not sure we want to report this - but theoretically the GCXPromotionAdView
          // constructor can fail when setting the URL for the image view which constitutes
          // the Load event so we report RequestScuccess before doing that call
          adServerAnalytics.pushEvent('AdRequestSuccess', merge(this.analyticsParameters(), {
            elapsed: Date.now() - this.startTimeRequest,
            appID: adData.appID,
            isRetry: (!isRetry && triesLeft === DEFAULT_RETRY_COUNT) ? false : true,
            isDirectShow: isDirectShow
          }), { postToDefaultProject: true });

          startTimeLoad = Date.now();
          var payload = deepCopy(this.payload);
          payload.sourceUID = adData.id;

          this.instance = new GCXPromotionAdView({
            appID: adData.appID,  // this is the target appID
            templateType: adData.templateType,
            payload: payload,
            imageURL: adData.assetURL,
            iconURL: adData.iconURL,
            headline: adData.headline,
            text: adData.text,
            cta: adData.button,
            delayClosable: adData.delayClosable
          });

          adServerAnalytics.pushEvent('AdLoadSuccess', merge(this.analyticsParameters(), {
            elapsed: Date.now() - startTimeLoad,
            elapsedSinceRequest: Date.now() - this.startTimeRequest,
            appID: this.instance.appID,
            isRetry: (!isRetry && triesLeft === DEFAULT_RETRY_COUNT) ? false : true,
            isDirectShow: isDirectShow
          }), { postToDefaultProject: true });
          logger.log('### AdLoadSuccess');
        })
      .return(this)
      .catch((e) => {
        logger.error('AdLoadFailed ' + e);

        adServerAnalytics.pushError('AdLoadFailed', e, merge(this.analyticsParameters(), {
          elapsed: Date.now() - startTimeLoad,
          elapsedSinceRequest: Date.now() - this.startTimeRequest,
          appID: this.instance.appID,
          isDirectShow: isDirectShow
        }), { postToDefaultProject: true });

        throw e;
      });
  }

  showAd (source, triesLeft = DEFAULT_RETRY_COUNT, isPreloaded) {
    return Promise.try(() => {
      this.startTimeShow = Date.now();

      // each ad show should pass the source into the payload
      this.instance.payload.sourceGameFeature = source;
      adServerAnalytics.pushEvent('AdShow', merge(
        this.analyticsParameters(), {
          elapsedSinceRequest: Date.now() - this.startTimeRequest,
          appID: this.instance.appID,
          gameFeature: source,
          isPreloaded: isPreloaded
        }), { postToDefaultProject: true });

      var showSuccessAnalyticsPayload = merge(
        this.analyticsParameters(), {
          elapsedSinceRequest: 0,
          elapsed: 0,
          appID: this.instance.appID,
          gameFeature: source,
          isPreloaded: isPreloaded
        });

      return this.instance.show().return(showSuccessAnalyticsPayload);
    })
    .catch((e) => {
      adServerAnalytics.pushEvent('AdShowFailed', e, merge(
        this.analyticsParameters(), {
          elapsed: Date.now() - this.startTimeShow,
          elapsedSinceRequest: Date.now() - this.startTimeRequest,
          appID: this.instance.appID,
          gameFeature: source,
          isPreloaded: isPreloaded
        }), { postToDefaultProject: true });
      logger.error('AdShowFailed ', e);

      throw e;
    })
    .then((showSuccessAnalyticsPayload) => {
      showSuccessAnalyticsPayload.elapsed = Date.now() - this.startTimeShow;
      showSuccessAnalyticsPayload.elapsedSinceRequest = Date.now() - this.startTimeRequest;
      adServerAnalytics.pushEvent(
        'AdShowSuccess',
        showSuccessAnalyticsPayload,
        { postToDefaultProject: true });
      logger.log('### AdShowSuccess');
      return facebook.switchGameAsync(this.instance.appID, this.instance.payload);
    })
    .then(() => {
      logger.log('### AdShowSuccess => switchGameAsyncSuccess');
      adServerAnalytics.pushEvent(
        'switchGameAsyncSuccess',
        this.instance.payload,
        { postToDefaultProject: true }
      );
    })
    .catch((e) => {
      logger.error('### switchGameAsyncFailed', e);
      adServerAnalytics.pushError(
        'switchGameAsyncFailed',
        e,
        this.instance.payload,
        { postToDefaultProject: true }
      );
    });
  }


}
