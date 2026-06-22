const { createApp } = require("../src/app");
const { closePool, migrateDatabase } = require("../src/config/db");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => null);

  return {
    status: response.status,
    body,
    headers: response.headers,
  };
}

async function main() {
  await migrateDatabase();
  const app = createApp();

  await new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;
      const uniqueSuffix = Date.now();
      const categoryName = `Test Category ${uniqueSuffix}`;
      const updatedCategoryName = `Updated Category ${uniqueSuffix}`;
      const menuName = `Test Menu ${uniqueSuffix}`;
      const updatedMenuName = `Updated Menu ${uniqueSuffix}`;
      let authCookie = "";
      let createdCategoryId = 0;
      let createdMenuId = 0;
      let createdHotIceMenuId = 0;

      async function cleanupCreatedData() {
        if (!authCookie) {
          return;
        }

        if (createdMenuId) {
          await requestJson(baseUrl, `/api/menus/${createdMenuId}`, {
            method: "DELETE",
            headers: {
              Cookie: authCookie,
            },
          }).catch(() => null);
        }

        if (createdHotIceMenuId) {
          await requestJson(baseUrl, `/api/menus/${createdHotIceMenuId}`, {
            method: "DELETE",
            headers: {
              Cookie: authCookie,
            },
          }).catch(() => null);
        }

        if (createdCategoryId) {
          await requestJson(baseUrl, `/api/categories/${createdCategoryId}`, {
            method: "DELETE",
            headers: {
              Cookie: authCookie,
            },
          }).catch(() => null);
        }
      }

      try {
        const live = await requestJson(baseUrl, "/api/live");
        assert(live.status === 200, "Live endpoint harus mengembalikan 200.");
        assert(live.body?.status === "alive", "Live endpoint harus mengembalikan status alive.");

        const ready = await requestJson(baseUrl, "/api/ready");
        assert(ready.status === 200, "Ready endpoint harus mengembalikan 200.");
        assert(ready.body?.status === "ready", "Ready endpoint harus mengembalikan status ready.");

        const health = await requestJson(baseUrl, "/api/health");
        assert(health.status === 200, "Health endpoint harus mengembalikan 200.");
        assert(health.body?.database === "connected", "Health endpoint harus melihat database connected.");

        const login = await requestJson(baseUrl, "/api/auth/admin/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "admin",
            password: "admin123",
          }),
        });

        assert(login.status === 200, "Login admin harus mengembalikan 200.");
        assert(login.body?.success === true, "Login admin harus success.");
        assert(login.body?.data?.username === "admin", "Login admin harus mengembalikan username admin.");
        assert(!Object.prototype.hasOwnProperty.call(login.body?.data || {}, "token"), "Login admin tidak boleh mengembalikan token mentah ke frontend.");

        authCookie = login.headers.get("set-cookie") || "";
        assert(authCookie, "Login admin harus mengembalikan cookie sesi.");

        const protectedWithoutAuth = await requestJson(baseUrl, "/api/categories");
        assert(protectedWithoutAuth.status === 401, "Route kategori tanpa auth harus 401.");

        const invalidReportMonth = await requestJson(baseUrl, "/api/reports/summary?month=2026-13", {
          headers: {
            Cookie: authCookie,
          },
        });
        assert(invalidReportMonth.status === 400, "Filter laporan invalid harus mengembalikan 400.");

        const createCategory = await requestJson(baseUrl, "/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
          },
          body: JSON.stringify({
            name: categoryName,
            description: "Category created by api-test",
          }),
        });

        assert(createCategory.status === 201, "Create kategori harus mengembalikan 201.");
        createdCategoryId = Number(createCategory.body?.data?.id || 0);
        assert(createdCategoryId > 0, "Create kategori harus mengembalikan id baru.");

        const updateCategory = await requestJson(baseUrl, `/api/categories/${createdCategoryId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
          },
          body: JSON.stringify({
            name: updatedCategoryName,
            description: "Updated by api-test",
          }),
        });
        assert(updateCategory.status === 200, "Update kategori harus mengembalikan 200.");
        assert(updateCategory.body?.data?.name === updatedCategoryName, "Update kategori harus mengubah nama.");

        const invalidMenu = await requestJson(baseUrl, "/api/menus", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
          },
          body: JSON.stringify({
            categoryId: createdCategoryId,
            name: `${menuName} Invalid`,
            price: -10,
            available: true,
          }),
        });
        assert(invalidMenu.status === 400, "Create menu dengan harga negatif harus mengembalikan 400.");

        const createMenu = await requestJson(baseUrl, "/api/menus", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
          },
          body: JSON.stringify({
            categoryId: createdCategoryId,
            name: menuName,
            description: "Menu created by api-test",
            price: 25000,
            available: true,
            imageUrl: "",
          }),
        });

        assert(createMenu.status === 201, "Create menu harus mengembalikan 201.");
        createdMenuId = Number(createMenu.body?.data?.id || 0);
        assert(createdMenuId > 0, "Create menu harus mengembalikan id baru.");

        const updateMenu = await requestJson(baseUrl, `/api/menus/${createdMenuId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
          },
          body: JSON.stringify({
            categoryId: createdCategoryId,
            name: updatedMenuName,
            description: "Updated by api-test",
            price: 30000,
            available: true,
            imageUrl: "",
          }),
        });
        assert(updateMenu.status === 200, "Update menu harus mengembalikan 200.");

        const publicMenus = await requestJson(baseUrl, "/api/menus");
        assert(publicMenus.status === 200, "Public menus endpoint harus mengembalikan 200.");
        assert(
          Array.isArray(publicMenus.body?.data) && publicMenus.body.data.some((item) => Number(item.id) === createdMenuId),
          "Menu baru harus muncul di endpoint public menus."
        );

        const createHotIceMenu = await requestJson(baseUrl, "/api/menus", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: authCookie,
          },
          body: JSON.stringify({
            categoryId: createdCategoryId,
            name: `${menuName} Hot Ice`,
            description: "Hot/Ice menu created by api-test",
            priceType: "hot_ice",
            priceHot: 20000,
            priceIce: 22000,
            available: true,
            imageUrl: "",
          }),
        });
        assert(createHotIceMenu.status === 201, "Create Hot/Ice menu harus mengembalikan 201.");
        createdHotIceMenuId = Number(createHotIceMenu.body?.data?.id || 0);
        assert(createdHotIceMenuId > 0, "Create Hot/Ice menu harus mengembalikan id baru.");

        // Test Case A: Successful order with Single Price item (no size) and Hot/Ice item with Hot variant
        const orderRes1 = await requestJson(baseUrl, "/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerName: "Test Order Client",
            phoneNumber: "08123456789",
            tableNumber: "T5",
            paymentMethod: "cash",
            items: [
              {
                id: createdMenuId,
                qty: 2,
              },
              {
                id: createdHotIceMenuId,
                qty: 1,
                size: "Hot",
              }
            ],
          }),
        });
        assert(orderRes1.status === 201, "Order dengan item valid harus mengembalikan 201.");
        assert(orderRes1.body?.success === true, "Order harus success.");
        const subtotal1 = orderRes1.body?.data?.totals?.subtotal || orderRes1.body?.data?.subtotal;
        assert(Number(subtotal1) === (2 * 30000 + 1 * 20000), "Subtotal order 1 salah.");

        // Test status transitions: received -> preparing -> ready -> done
        const testOrderNumber = orderRes1.body?.data?.orderNumber;
        assert(testOrderNumber, "Order number harus terdefinisi.");

        const advance1 = await requestJson(baseUrl, `/api/orders/${testOrderNumber}/status`, {
          method: "PATCH",
          headers: {
            Cookie: authCookie,
          },
        });
        assert(advance1.status === 200, "Advance status received -> preparing harus 200.");
        assert(advance1.body?.data?.status === "preparing", "Status baru harus preparing.");

        const advance2 = await requestJson(baseUrl, `/api/orders/${testOrderNumber}/status`, {
          method: "PATCH",
          headers: {
            Cookie: authCookie,
          },
        });
        assert(advance2.status === 200, "Advance status preparing -> ready harus 200.");
        assert(advance2.body?.data?.status === "ready", "Status baru harus ready.");

        const advance3 = await requestJson(baseUrl, `/api/orders/${testOrderNumber}/status`, {
          method: "PATCH",
          headers: {
            Cookie: authCookie,
          },
        });
        assert(advance3.status === 200, "Advance status ready -> done harus 200.");
        assert(advance3.body?.data?.status === "done", "Status baru harus done.");

        const advance4 = await requestJson(baseUrl, `/api/orders/${testOrderNumber}/status`, {
          method: "PATCH",
          headers: {
            Cookie: authCookie,
          },
        });
        assert(advance4.status === 400, "Advance status dari done harus gagal (400).");

        // Test Case B: Successful order with Hot/Ice item with Ice variant
        const orderRes2 = await requestJson(baseUrl, "/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerName: "Test Order Client",
            phoneNumber: "08123456789",
            tableNumber: "T5",
            paymentMethod: "cash",
            items: [
              {
                id: createdHotIceMenuId,
                qty: 3,
                size: "Ice",
              }
            ],
          }),
        });
        assert(orderRes2.status === 201, "Order dengan item Ice valid harus mengembalikan 201.");
        const subtotal2 = orderRes2.body?.data?.totals?.subtotal || orderRes2.body?.data?.subtotal;
        assert(Number(subtotal2) === (3 * 22000), "Subtotal order 2 salah.");

        // Test Case C: Order with Hot/Ice item but NO variant (should fail with 400)
        const orderRes3 = await requestJson(baseUrl, "/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customerName: "Test Order Client",
            phoneNumber: "08123456789",
            tableNumber: "T5",
            paymentMethod: "cash",
            items: [
              {
                id: createdHotIceMenuId,
                qty: 1,
              }
            ],
          }),
        });
        assert(orderRes3.status === 400, "Order Hot/Ice tanpa varian harus mengembalikan 400.");

        const deleteHotIceMenu = await requestJson(baseUrl, `/api/menus/${createdHotIceMenuId}`, {
          method: "DELETE",
          headers: {
            Cookie: authCookie,
          },
        });
        assert(deleteHotIceMenu.status === 200, "Delete Hot/Ice menu harus mengembalikan 200.");
        createdHotIceMenuId = 0;

        const deleteMenu = await requestJson(baseUrl, `/api/menus/${createdMenuId}`, {
          method: "DELETE",
          headers: {
            Cookie: authCookie,
          },
        });
        assert(deleteMenu.status === 200, "Delete menu harus mengembalikan 200.");
        createdMenuId = 0;

        const deleteCategory = await requestJson(baseUrl, `/api/categories/${createdCategoryId}`, {
          method: "DELETE",
          headers: {
            Cookie: authCookie,
          },
        });
        assert(deleteCategory.status === 200, "Delete kategori harus mengembalikan 200.");
        createdCategoryId = 0;

        console.log("API test passed.");
        server.close((closeError) => {
          if (closeError) {
            reject(closeError);
            return;
          }

          resolve();
        });
      } catch (error) {
        await cleanupCreatedData();
        server.close(() => {
          reject(error);
        });
      }
    });

    server.on("error", reject);
  });
}

main()
  .then(() => closePool())
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error.message || error);
    return closePool().finally(() => {
      process.exit(1);
    });
  });
