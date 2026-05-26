const attemptsByKey = new Map();

function getWindowMs() {
  return Number(process.env.ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
}

function getMaxAttempts() {
  return Number(process.env.ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS || 5);
}

function getClientIp(request) {
  const forwardedFor = String(request.headers["x-forwarded-for"] || "").trim();

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return (
    request.ip
    || request.socket?.remoteAddress
    || "unknown"
  );
}

function getAttemptKey(request) {
  const username = String(request.body?.username || "").trim().toLowerCase() || "anonymous";
  return `${getClientIp(request)}::${username}`;
}

function clearExpiredAttempts(now = Date.now()) {
  const windowMs = getWindowMs();

  for (const [key, entry] of attemptsByKey.entries()) {
    if (!entry?.expiresAt || entry.expiresAt <= now) {
      attemptsByKey.delete(key);
      continue;
    }

    if (entry.firstAttemptAt && now - entry.firstAttemptAt > windowMs) {
      attemptsByKey.delete(key);
    }
  }
}

function recordFailedLoginAttempt(request) {
  const now = Date.now();
  const windowMs = getWindowMs();
  const key = getAttemptKey(request);
  const currentEntry = attemptsByKey.get(key);

  if (!currentEntry || currentEntry.expiresAt <= now) {
    attemptsByKey.set(key, {
      count: 1,
      firstAttemptAt: now,
      expiresAt: now + windowMs,
    });
    return;
  }

  attemptsByKey.set(key, {
    ...currentEntry,
    count: Number(currentEntry.count || 0) + 1,
    expiresAt: currentEntry.expiresAt,
  });
}

function clearFailedLoginAttempts(request) {
  attemptsByKey.delete(getAttemptKey(request));
}

function adminLoginRateLimit(request, response, next) {
  const now = Date.now();
  clearExpiredAttempts(now);

  const entry = attemptsByKey.get(getAttemptKey(request));
  const maxAttempts = getMaxAttempts();

  if (entry && Number(entry.count || 0) >= maxAttempts && entry.expiresAt > now) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));

    response.setHeader("Retry-After", String(retryAfterSeconds));
    return response.status(429).json({
      success: false,
      message: "Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.",
    });
  }

  return next();
}

module.exports = {
  adminLoginRateLimit,
  recordFailedLoginAttempt,
  clearFailedLoginAttempts,
};
