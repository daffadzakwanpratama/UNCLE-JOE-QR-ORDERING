function parseCookies(cookieHeader) {
  const result = {};

  if (!cookieHeader || typeof cookieHeader !== "string") {
    return result;
  }

  const pairs = cookieHeader.split(";");

  for (const pair of pairs) {
    const [rawName, ...rawValueParts] = pair.split("=");
    const name = String(rawName || "").trim();

    if (!name) {
      continue;
    }

    result[name] = decodeURIComponent(rawValueParts.join("=").trim());
  }

  return result;
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Number(options.maxAge)}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

module.exports = {
  parseCookies,
  serializeCookie,
};
