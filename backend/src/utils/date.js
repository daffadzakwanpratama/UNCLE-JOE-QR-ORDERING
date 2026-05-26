function formatDateOnly(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return "";
  }

  return stringValue.slice(0, 10);
}

function getTodayDateLabel() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = {
  formatDateOnly,
  getTodayDateLabel,
};
