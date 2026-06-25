const clientRequests = new Map();

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

function clearExpiredRequests(windowMs, now = Date.now()) {
  for (const [key, entry] of clientRequests.entries()) {
    if (now - entry.firstRequestAt > windowMs) {
      clientRequests.delete(key);
    }
  }
}

function createRateLimiter({ windowMs, maxRequests, message, keyPrefix = "req" }) {
  return function (request, response, next) {
    const now = Date.now();
    clearExpiredRequests(windowMs, now);

    const ip = getClientIp(request);
    const key = `${keyPrefix}::${ip}`;
    const entry = clientRequests.get(key);

    if (!entry) {
      clientRequests.set(key, {
        count: 1,
        firstRequestAt: now,
      });
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.firstRequestAt + windowMs - now) / 1000));
      response.setHeader("Retry-After", String(retryAfterSeconds));
      return response.status(429).json({
        success: false,
        message: message || "Terlalu banyak permintaan dari IP ini. Silakan coba lagi nanti.",
      });
    }

    entry.count += 1;
    clientRequests.set(key, entry);
    return next();
  };
}

module.exports = {
  createRateLimiter,
};
