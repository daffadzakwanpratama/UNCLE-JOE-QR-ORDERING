function getDefaultApiBaseUrl() {
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return `${window.location.origin}/api`;
  }

  return "";
}

function shouldUseLocalhostFallback() {
  const { protocol, hostname } = window.location;

  if (protocol === "file:") {
    return true;
  }

  return ["localhost", "127.0.0.1"].includes(hostname);
}

function isLikelyHtmlResponse(response) {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  return contentType.includes("text/html");
}

function createApiError(message, details = {}) {
  const error = new Error(message);
  Object.assign(error, details);
  return error;
}

function getInvalidApiResponseMessage(baseUrl, response) {
  const currentOrigin = window.location.origin;
  const currentProtocol = window.location.protocol;
  const normalizedBaseUrl = String(baseUrl || "");
  const isCrossOriginApi = currentProtocol !== "file:" && normalizedBaseUrl && !normalizedBaseUrl.startsWith(`${currentOrigin}/`);

  if (response.status === 404 || isLikelyHtmlResponse(response)) {
    if (currentProtocol === "file:") {
      return "Kamu membuka halaman langsung dari file. Jalankan backend lalu buka admin dari http://localhost:4000/admin.";
    }

    if (isCrossOriginApi) {
      return "API yang dituju tidak cocok dengan halaman ini. Periksa server frontend, backend, atau reset API URL yang tersimpan.";
    }

    return "Respons API tidak valid. Kemungkinan halaman ini dibuka dari server yang salah atau route API belum tersedia.";
  }

  return "Respons API tidak valid.";
}

function getNetworkFailureMessage() {
  if (window.location.protocol === "file:") {
    return "Backend belum terhubung. Jalankan backend lalu buka admin dari http://localhost:4000/admin.";
  }

  if (shouldUseLocalhostFallback()) {
    return "Backend belum bisa dijangkau. Pastikan server Node.js sedang berjalan.";
  }

  return "API tidak bisa dijangkau. Periksa koneksi backend atau konfigurasi domain API.";
}

function createApiClient({
  storageKey = "",
  globalBaseUrlKey = "QR_ORDERING_API_URL",
  defaultBaseUrl = getDefaultApiBaseUrl(),
  fallbackBaseUrls = [],
  includeCredentials = false,
  getAuthorizationToken = null,
  onUnauthorized = null,
} = {}) {
  const configuredBaseUrl = window.localStorage.getItem(storageKey)
    || window[globalBaseUrlKey]
    || defaultBaseUrl;
  const candidateBaseUrls = [
    configuredBaseUrl,
    ...fallbackBaseUrls,
    defaultBaseUrl,
    ...(shouldUseLocalhostFallback() ? ["http://localhost:4000/api"] : []),
  ].filter((value, index, list) => value && list.indexOf(value) === index);

  async function requestWithBaseUrl(baseUrl, path, options = {}) {
    const authorizationToken = typeof getAuthorizationToken === "function"
      ? String(getAuthorizationToken() || "").trim()
      : "";

    let response;

    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...(includeCredentials ? { credentials: "include" } : {}),
        headers: {
          "Content-Type": "application/json",
          ...(authorizationToken ? { Authorization: `Bearer ${authorizationToken}` } : {}),
          ...(options.headers || {}),
        },
        ...options,
      });
    } catch (error) {
      throw createApiError(getNetworkFailureMessage(), {
        code: "API_NETWORK_ERROR",
        baseUrl,
        cause: error,
      });
    }

    const payload = await response.json().catch(() => ({
      success: false,
      message: getInvalidApiResponseMessage(baseUrl, response),
    }));

    if (!response.ok || payload.success === false) {
      if (response.status === 401 && typeof onUnauthorized === "function") {
        onUnauthorized();
      }

      throw createApiError(payload.message || "Permintaan API gagal.", {
        code: response.ok ? "API_INVALID_RESPONSE" : "API_REQUEST_FAILED",
        status: response.status,
        baseUrl,
      });
    }

    return payload;
  }

  async function request(path, options = {}) {
    let lastError = null;

    for (const baseUrl of candidateBaseUrls) {
      try {
        const payload = await requestWithBaseUrl(baseUrl, path, options);

        if (storageKey && window.localStorage.getItem(storageKey) !== baseUrl) {
          window.localStorage.setItem(storageKey, baseUrl);
        }

        apiClient.baseUrl = baseUrl;
        return payload;
      } catch (error) {
        lastError = error;

        const shouldTryNextBaseUrl = error.code === "API_INVALID_RESPONSE"
          || error.code === "API_NETWORK_ERROR";

        if (!shouldTryNextBaseUrl) {
          throw error;
        }
      }
    }

    throw lastError || new Error("Permintaan API gagal.");
  }

  const apiClient = {
    baseUrl: configuredBaseUrl,
    request,
  };

  return apiClient;
}

function resolveApiAssetUrl(baseUrl, value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  if (/^(data:|https?:\/\/|blob:)/i.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    const origin = String(baseUrl || "").replace(/\/api\/?$/, "");
    return `${origin}${value}`;
  }

  return value;
}

function mapApiImageAsset(baseUrl, item, fieldName = "imageUrl") {
  return {
    ...item,
    [fieldName]: resolveApiAssetUrl(baseUrl, item?.[fieldName] || ""),
  };
}

window.FrontendApiBaseClient = {
  createApiClient,
  getDefaultApiBaseUrl,
  resolveApiAssetUrl,
  mapApiImageAsset,
};
