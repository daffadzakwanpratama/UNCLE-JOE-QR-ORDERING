function getAdminApiClient() {
  if (!window.AdminApiClient?.request) {
    throw new Error("Admin API client belum dimuat.");
  }

  return window.AdminApiClient;
}

function mapMenuAsset(item) {
  return window.FrontendApiBaseClient.mapApiImageAsset(
    getAdminApiClient().baseUrl,
    item,
    "imageUrl"
  );
}

function mapBannerAsset(item) {
  return window.FrontendApiBaseClient.mapApiImageAsset(
    getAdminApiClient().baseUrl,
    item,
    "imageUrl"
  );
}

async function loginAdminWithApi(username, password) {
  const payload = await getAdminApiClient().request("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  return payload.data;
}

async function fetchAdminSessionFromApi() {
  const payload = await getAdminApiClient().request("/auth/admin/session");
  return payload.data;
}

async function logoutAdminWithApi() {
  return getAdminApiClient().request("/auth/admin/logout", {
    method: "POST",
  });
}

async function fetchCategoriesFromApi() {
  const payload = await getAdminApiClient().request("/categories");
  return Array.isArray(payload.data) ? payload.data : [];
}

async function createCategoryWithApi(category) {
  const payload = await getAdminApiClient().request("/categories", {
    method: "POST",
    body: JSON.stringify(category),
  });

  return payload.data;
}

async function updateCategoryWithApi(id, category) {
  const payload = await getAdminApiClient().request(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(category),
  });

  return payload.data;
}

async function deleteCategoryWithApi(id) {
  return getAdminApiClient().request(`/categories/${id}`, {
    method: "DELETE",
  });
}

async function fetchMenusFromApi() {
  const payload = await getAdminApiClient().request("/menus");
  return Array.isArray(payload.data) ? payload.data.map(mapMenuAsset) : [];
}

async function createMenuWithApi(menu) {
  const payload = await getAdminApiClient().request("/menus", {
    method: "POST",
    body: JSON.stringify(menu),
  });

  return payload.data;
}

async function updateMenuWithApi(id, menu) {
  const payload = await getAdminApiClient().request(`/menus/${id}`, {
    method: "PUT",
    body: JSON.stringify(menu),
  });

  return payload.data;
}

async function deleteMenuWithApi(id) {
  return getAdminApiClient().request(`/menus/${id}`, {
    method: "DELETE",
  });
}

async function fetchOrdersFromApi() {
  const payload = await getAdminApiClient().request("/orders");
  return Array.isArray(payload.data) ? payload.data : [];
}

async function fetchOrderDetailFromApi(orderNumber) {
  const payload = await getAdminApiClient().request(`/orders/${encodeURIComponent(orderNumber)}`);
  return payload.data;
}

async function advanceOrderStatusFromApi(orderNumber) {
  const payload = await getAdminApiClient().request(`/orders/${encodeURIComponent(orderNumber)}/status`, {
    method: "PATCH",
  });
  return payload.data;
}

async function fetchBannersFromApi() {
  const payload = await getAdminApiClient().request("/banners/manage");
  return Array.isArray(payload.data) ? payload.data.map(mapBannerAsset) : [];
}

async function createBannerWithApi(banner) {
  const payload = await getAdminApiClient().request("/banners/manage", {
    method: "POST",
    body: JSON.stringify(banner),
  });

  return payload.data;
}

async function updateBannerWithApi(id, banner) {
  const payload = await getAdminApiClient().request(`/banners/manage/${id}`, {
    method: "PUT",
    body: JSON.stringify(banner),
  });

  return payload.data;
}

async function deleteBannerWithApi(id) {
  return getAdminApiClient().request(`/banners/manage/${id}`, {
    method: "DELETE",
  });
}

async function fetchDiscountsFromApi() {
  const payload = await getAdminApiClient().request("/discounts/manage");
  return Array.isArray(payload.data) ? payload.data : [];
}

async function createDiscountWithApi(discount) {
  const payload = await getAdminApiClient().request("/discounts/manage", {
    method: "POST",
    body: JSON.stringify(discount),
  });

  return payload.data;
}

async function updateDiscountWithApi(id, discount) {
  const payload = await getAdminApiClient().request(`/discounts/manage/${id}`, {
    method: "PUT",
    body: JSON.stringify(discount),
  });

  return payload.data;
}

async function deleteDiscountWithApi(id) {
  return getAdminApiClient().request(`/discounts/manage/${id}`, {
    method: "DELETE",
  });
}

async function fetchReportSummaryFromApi(month = "") {
  const suffix = month ? `?month=${encodeURIComponent(month)}` : "";
  const payload = await getAdminApiClient().request(`/reports/summary${suffix}`);
  return payload.data;
}

async function fetchReportTransactionsFromApi(month = "") {
  const suffix = month ? `?month=${encodeURIComponent(month)}` : "";
  const payload = await getAdminApiClient().request(`/reports/transactions${suffix}`);
  return Array.isArray(payload.data) ? payload.data : [];
}

async function updateOrderPaymentStatusFromApi(orderNumber, paymentStatus) {
  const payload = await getAdminApiClient().request(`/orders/${encodeURIComponent(orderNumber)}/payment-status`, {
    method: "PATCH",
    body: JSON.stringify({ paymentStatus }),
  });
  return payload.data;
}

async function clearOrdersWithApi(orderNumbers) {
  const payload = await getAdminApiClient().request("/orders/clear", {
    method: "POST",
    body: JSON.stringify({ orderNumbers }),
  });
  return payload.data;
}

window.AdminApi = {
  loginAdmin: loginAdminWithApi,
  fetchAdminSession: fetchAdminSessionFromApi,
  logoutAdmin: logoutAdminWithApi,
  fetchCategories: fetchCategoriesFromApi,
  createCategory: createCategoryWithApi,
  updateCategory: updateCategoryWithApi,
  deleteCategory: deleteCategoryWithApi,
  fetchMenus: fetchMenusFromApi,
  createMenu: createMenuWithApi,
  updateMenu: updateMenuWithApi,
  deleteMenu: deleteMenuWithApi,
  fetchOrders: fetchOrdersFromApi,
  fetchOrderDetail: fetchOrderDetailFromApi,
  advanceOrderStatus: advanceOrderStatusFromApi,
  fetchBanners: fetchBannersFromApi,
  createBanner: createBannerWithApi,
  updateBanner: updateBannerWithApi,
  deleteBanner: deleteBannerWithApi,
  fetchDiscounts: fetchDiscountsFromApi,
  createDiscount: createDiscountWithApi,
  updateDiscount: updateDiscountWithApi,
  deleteDiscount: deleteDiscountWithApi,
  fetchReportSummary: fetchReportSummaryFromApi,
  fetchReportTransactions: fetchReportTransactionsFromApi,
  updateOrderPaymentStatus: updateOrderPaymentStatusFromApi,
  clearOrders: clearOrdersWithApi,
};
