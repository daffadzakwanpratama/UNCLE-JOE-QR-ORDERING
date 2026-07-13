const crypto = require("crypto");

function getMidtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const clientKey = process.env.MIDTRANS_CLIENT_KEY || "";
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  
  const snapUrl = isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const statusBaseUrl = isProduction
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";

  return {
    serverKey,
    clientKey,
    isProduction,
    snapUrl,
    statusBaseUrl,
  };
}

function getAuthorizationHeader(serverKey) {
  return `Basic ${Buffer.from(serverKey + ":").toString("base64")}`;
}

async function getTransactionStatus(orderNumber) {
  const { serverKey, statusBaseUrl } = getMidtransConfig();
  if (!serverKey) {
    throw new Error("Midtrans Server Key belum dikonfigurasi.");
  }

  const url = `${statusBaseUrl}/${orderNumber}/status`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: getAuthorizationHeader(serverKey),
    },
  });

  if (!res.ok) {
    const errorDetails = await res.text();
    throw new Error(`Midtrans Status API Error: ${res.status} - ${errorDetails}`);
  }

  return res.json();
}

async function createSnapTransaction(orderNumber, grossAmount, customerName, phoneNumber, itemsPayload) {
  const { serverKey, snapUrl } = getMidtransConfig();
  if (!serverKey) {
    throw new Error("Midtrans Server Key belum dikonfigurasi.");
  }

  const payload = {
    transaction_details: {
      order_id: orderNumber,
      gross_amount: grossAmount,
    },
    credit_card: {
      secure: true,
    },
    customer_details: {
      first_name: customerName,
      phone: phoneNumber || "",
    },
    item_details: itemsPayload,
  };

  const res = await fetch(snapUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: getAuthorizationHeader(serverKey),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Midtrans Snap API Error: ${JSON.stringify(data)}`);
  }

  return data;
}

function verifySignatureKey(orderId, statusCode, grossAmount, signatureKey) {
  const { serverKey } = getMidtransConfig();
  const stringToHash = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const computedSignature = crypto.createHash("sha512").update(stringToHash).digest("hex");
  return computedSignature === signatureKey;
}

function mapTransactionStatusToPaymentStatus(transactionStatus, fraudStatus) {
  if (transactionStatus === "capture") {
    if (fraudStatus === "challenge") {
      return "pending";
    } else if (fraudStatus === "accept") {
      return "paid";
    }
  } else if (transactionStatus === "settlement") {
    return "paid";
  } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
    return "failed";
  }
  return "pending";
}

module.exports = {
  getMidtransConfig,
  getTransactionStatus,
  createSnapTransaction,
  verifySignatureKey,
  mapTransactionStatusToPaymentStatus,
};
