function isRequestLoggingEnabled() {
  const rawValue = String(process.env.ENABLE_REQUEST_LOGS || "").trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(rawValue)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(rawValue)) {
    return false;
  }

  return process.env.NODE_ENV !== "test";
}

function shouldSkipRequestLogging(request) {
  const pathname = String(request.path || "");

  if (pathname === "/api/live") {
    return true;
  }

  const skipHealthLogs = String(process.env.LOG_HEALTHCHECK_REQUESTS || "").trim().toLowerCase();
  const shouldLogHealthChecks = ["true", "1", "yes", "on"].includes(skipHealthLogs);

  if (!shouldLogHealthChecks && ["/api/health", "/api/ready"].includes(pathname)) {
    return true;
  }

  return false;
}

function requestLogger(request, response, next) {
  if (!isRequestLoggingEnabled() || shouldSkipRequestLogging(request)) {
    return next();
  }

  const startedAt = Date.now();

  response.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const forwardedFor = String(request.headers["x-forwarded-for"] || "").trim();
    const clientIp = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : (request.ip || request.socket?.remoteAddress || "unknown");

    console.log(
      `[${new Date().toISOString()}] ${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms ip=${clientIp}`
    );
  });

  return next();
}

module.exports = {
  requestLogger,
};
