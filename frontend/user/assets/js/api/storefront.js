function getUserApiClient() {
  if (!window.UserApiClient?.request) {
    throw new Error("User API client belum siap.");
  }

  return window.UserApiClient;
}

function mapStorefrontMenu(item) {
  return window.FrontendApiBaseClient.mapApiImageAsset(
    getUserApiClient().baseUrl,
    item,
    "imageUrl"
  );
}

function mapStorefrontBanner(item) {
  return window.FrontendApiBaseClient.mapApiImageAsset(
    getUserApiClient().baseUrl,
    item,
    "imageUrl"
  );
}

async function fetchStorefrontMenuCatalog() {
  const client = getUserApiClient();
  const [menusPayload, bannersPayload] = await Promise.all([
    client.request("/menus"),
    client.request("/banners"),
  ]);

  return {
    menus: Array.isArray(menusPayload.data) ? menusPayload.data.map(mapStorefrontMenu) : [],
    banners: Array.isArray(bannersPayload.data) ? bannersPayload.data.map(mapStorefrontBanner) : [],
  };
}

async function fetchStorefrontDiscountCatalog() {
  const payload = await getUserApiClient().request("/discounts");
  return Array.isArray(payload.data) ? payload.data : [];
}

async function validateStorefrontDiscountCode(code) {
  const payload = await getUserApiClient().request(`/discounts/validate/${encodeURIComponent(code)}`);
  return payload.data || null;
}

async function createStorefrontOrder(orderPayload) {
  const payload = await getUserApiClient().request("/orders", {
    method: "POST",
    body: JSON.stringify(orderPayload),
  });

  return payload.data;
}

async function fetchStorefrontOrderByNumber(orderNumber) {
  const payload = await getUserApiClient().request(`/orders/${encodeURIComponent(orderNumber)}`);
  return payload.data;
}

async function fetchStorefrontMidtransConfig() {
  const payload = await getUserApiClient().request("/config/midtrans");
  return payload.data;
}

async function changeStorefrontOrderPaymentMethod(orderNumber, paymentMethod) {
  const payload = await getUserApiClient().request(`/orders/${encodeURIComponent(orderNumber)}/payment-method`, {
    method: "PATCH",
    body: JSON.stringify({ paymentMethod }),
  });
  return payload.data;
}

async function fetchStorefrontSettings() {
  const payload = await getUserApiClient().request("/settings");
  return payload.data || null;
}

window.UserApi = {
  fetchMenuCatalog: fetchStorefrontMenuCatalog,
  fetchDiscountCatalog: fetchStorefrontDiscountCatalog,
  validateDiscountCode: validateStorefrontDiscountCode,
  createOrder: createStorefrontOrder,
  fetchOrderByNumber: fetchStorefrontOrderByNumber,
  fetchMidtransConfig: fetchStorefrontMidtransConfig,
  changeOrderPaymentMethod: changeStorefrontOrderPaymentMethod,
  fetchSettings: fetchStorefrontSettings,
};
