const adminApiClient = window.FrontendApiBaseClient.createApiClient({
  storageKey: "qr-admin-api-base-url",
  includeCredentials: true,
  onUnauthorized() {
    window.localStorage.removeItem("qr-admin-session");

    if (!window.location.pathname.endsWith("/login.html")) {
      window.location.href = "./login.html";
    }
  },
});

window.AdminApiClient = adminApiClient;
