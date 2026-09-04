const { ApiError } = require('./ApiError');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isValidUrl(v) {
  if (!isNonEmptyString(v)) return false;
  try {
    // eslint-disable-next-line no-new
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(v) {
  return isNonEmptyString(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isPositiveNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) {
    throw new ApiError(400, `Missing required field(s): ${missing.join(', ')}`);
  }
}

module.exports = { isNonEmptyString, isValidUrl, isValidEmail, isPositiveNumber, requireFields };
