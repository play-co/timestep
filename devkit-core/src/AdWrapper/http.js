import axios from 'axios';
import { logger } from 'base';

export const GCXPromotionAdURL = 'https://storage.googleapis.com/ads-xpromote/v1/'+process.env.FLATLINE_APP_ID+'/gc_ad_css.json';
export const GCXPromotionAdURLTest = 'https://storage.googleapis.com/ads-xpromote/v1/'+process.env.FLATLINE_APP_ID+'/gc_ad2_css.json';
export const GCXPromotionAdConfigURL = 'https://storage.googleapis.com/ads-xpromote/v1/'+process.env.FLATLINE_APP_ID+'/adserver_config.json';

export function fetchAdData() {
  var useUrl = GCXPromotionAdURL;
  // get two different ad files in RC0 for testing
  if (process.env.FLATLINE_APP_ID === 'everwing-rc0' && Math.random() >= 0.5) {
    useUrl = GCXPromotionAdURLTest;
  }
  return fetchURL(useUrl);
}

export function fetchAdConfig() {
  return fetchURL(GCXPromotionAdConfigURL);
}

function fetchURL(url) {
  return axios.get(
    url
    // params: {
    //   appID: process.env.FLATLINE_APP_ID
    // }
  ).then((response) => {
    return response.data;
  })
  .catch((e) => {
    console.error('error fetching url ' + url + ' data: ' + e.message);
    logger.error('error fetching url ' + url + ' data: ' + e.message);
    throw e;
  });
}
