import { logger } from 'base';

// Only one background sound can be played at a time.
// define AudioContext as best as possible; it may not exist
var AudioContext = window.AudioContext || window.webkitAudioContext;

// global private variables
var audioContext = null;

// use an AudioContext if available, otherwise fallback to Audio
if (AudioContext) {
  try {
    audioContext = new AudioContext();
  } catch (e) {
    // most commonly due to hardware limits on AudioContext instances
    logger.warn('HTML5 AudioContext init failed, falling back to Audio!');
  }
} else {
  logger.warn('HTML5 AudioContext not supported, falling back to Audio!');
}

export default audioContext;
