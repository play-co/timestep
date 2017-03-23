import { logger } from 'base';
import Image from './Image';

// TODO: Deprecated. Remove this when convenient.

export default {

  clear: function () { logger.error('Unimplemented'); },

  getImage: function (url, forceReload) {
    return Image.fromURL(url, forceReload);
  }

}
