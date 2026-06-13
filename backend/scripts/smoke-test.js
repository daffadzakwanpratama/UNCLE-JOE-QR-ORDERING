const { createApp } = require("../src/app");
const { query, closePool, migrateDatabase } = require("../src/config/db");
const { createAdminToken } = require("../src/utils/adminToken");

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => null);

  return {
    status: response.status,
    body,
    headers: response.headers,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  await migrateDatabase();
  const admins = await query(
    `SELECT id, username, role
     FROM admins
     LIMIT 1`
  );
  const admin = admins[0];

  assert(admin, "Smoke test butuh minimal satu admin di database.");

  const token = createAdminToken(admin);
  const cookie = `${process.env.ADMIN_COOKIE_NAME || "qr_ordering_admin"}=${encodeURIComponent(token)}`;
  const app = createApp();

  await new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const health = await requestJson(baseUrl, "/api/health");
        assert(health.status === 200, "Health endpoint harus mengembalikan 200.");
        assert(health.body?.database === "connected", "Health endpoint harus melihat database connected.");

        const publicMenus = await requestJson(baseUrl, "/api/menus");
        assert(publicMenus.status === 200, "Public menus endpoint harus mengembalikan 200.");
        assert(Array.isArray(publicMenus.body?.data), "Public menus endpoint harus mengembalikan array data.");

        const protectedWithoutAuth = await requestJson(baseUrl, "/api/reports/summary");
        assert(protectedWithoutAuth.status === 401, "Protected report endpoint tanpa auth harus 401.");

        const protectedWithAuth = await requestJson(baseUrl, "/api/reports/summary", {
          headers: {
            Cookie: cookie,
          },
        });
        assert(protectedWithAuth.status === 200, "Protected report endpoint dengan cookie auth harus 200.");
        assert(protectedWithAuth.body?.success === true, "Protected report endpoint harus success.");

        const promoValidation = await requestJson(baseUrl, "/api/discounts/validate/HEMAT10");
        assert(promoValidation.status === 200, "Promo validation endpoint harus mengembalikan 200.");
        assert(
          typeof promoValidation.body?.data?.isValid === "boolean",
          "Promo validation endpoint harus mengembalikan flag isValid."
        );

        console.log("Smoke test passed.");
        server.close((closeError) => {
          if (closeError) {
            reject(closeError);
            return;
          }

          resolve();
        });
      } catch (error) {
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
