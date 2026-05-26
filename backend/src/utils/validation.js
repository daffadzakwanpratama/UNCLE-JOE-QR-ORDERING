function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function toTrimmedString(value) {
  return String(value ?? "").trim();
}

function requireNonEmptyString(value, message, { maxLength = 0 } = {}) {
  const normalizedValue = toTrimmedString(value);

  if (!normalizedValue) {
    throw badRequest(message);
  }

  if (maxLength > 0 && normalizedValue.length > maxLength) {
    throw badRequest(`${message} Maksimal ${maxLength} karakter.`);
  }

  return normalizedValue;
}

function optionalTrimmedString(value, { maxLength = 0 } = {}) {
  const normalizedValue = toTrimmedString(value);

  if (!normalizedValue) {
    return "";
  }

  if (maxLength > 0 && normalizedValue.length > maxLength) {
    throw badRequest(`Input terlalu panjang. Maksimal ${maxLength} karakter.`);
  }

  return normalizedValue;
}

function requirePositiveInteger(value, message) {
  const normalizedValue = Number(value);

  if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
    throw badRequest(message);
  }

  return normalizedValue;
}

function requireNonNegativeNumber(value, message) {
  const normalizedValue = Number(value);

  if (!Number.isFinite(normalizedValue) || normalizedValue < 0) {
    throw badRequest(message);
  }

  return normalizedValue;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  const normalizedValue = toTrimmedString(value).toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalizedValue);
}

function isValidMonthString(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

function isValidDateString(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
}

function optionalDateString(value, message) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalizedValue = toTrimmedString(value);

  if (!isValidDateString(normalizedValue)) {
    throw badRequest(message);
  }

  return normalizedValue;
}

function optionalMonthString(value, message) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalizedValue = toTrimmedString(value);

  if (!isValidMonthString(normalizedValue)) {
    throw badRequest(message);
  }

  return normalizedValue;
}

function ensureDateRange(startDate, endDate, message) {
  if (startDate && endDate && startDate > endDate) {
    throw badRequest(message);
  }
}

module.exports = {
  badRequest,
  toTrimmedString,
  requireNonEmptyString,
  optionalTrimmedString,
  requirePositiveInteger,
  requireNonNegativeNumber,
  normalizeBoolean,
  optionalDateString,
  optionalMonthString,
  ensureDateRange,
};
