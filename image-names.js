// Two valid note-image naming schemes exist on disk:
//  1. Uploads   — note_<userId>_<timestamp>.webp   (owner id embedded)
//  2. Imports   — <timestamp>_<random>.<ext>        (from Google Keep Takeout /
//                 backup import; keeps the original extension, no owner id)
// The uploader's id can only be read off scheme 1; imported images carry no
// owner, so access to them is gated solely by the note that references them.
const path = require('path');

const UPLOADED_IMAGE_RE = /^note_(\d+)_\d+\.webp$/;
const IMPORTED_IMAGE_RE = /^\d+_[a-zA-Z0-9]+\.(webp|jpe?g|png|gif|heic|heif|bmp|avif)$/i;

// Is `name` a well-formed, servable note-image filename (either scheme)?
// Non-strings, and anything that is not a bare filename, are rejected.
function isValidImageName(name) {
  return typeof name === 'string'
    && name === path.basename(name)
    && (UPLOADED_IMAGE_RE.test(name) || IMPORTED_IMAGE_RE.test(name));
}

// Return the uploader's user id encoded in an image filename, or null if the
// name isn't an upload (`note_<userId>_<timestamp>.webp`) — e.g. imported images.
function imageOwnerId(filename) {
  const m = UPLOADED_IMAGE_RE.exec(filename);
  return m ? parseInt(m[1], 10) : null;
}

module.exports = { UPLOADED_IMAGE_RE, IMPORTED_IMAGE_RE, isValidImageName, imageOwnerId };
