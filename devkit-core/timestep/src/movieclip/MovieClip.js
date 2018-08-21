/* eslint-disable no-redeclare */
/// #if IS_LEGACY_MOVIECLIP
var MovieClip = require('./legacy/MovieClip').default;
/// #else
var MovieClip = require('./current/MovieClip').default;
/// #endif

export default MovieClip;
