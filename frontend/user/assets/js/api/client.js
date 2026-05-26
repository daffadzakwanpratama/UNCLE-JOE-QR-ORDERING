const userApiClient = window.FrontendApiBaseClient.createApiClient({
  storageKey: "qr-user-api-base-url",
});

window.UserApiClient = userApiClient;
