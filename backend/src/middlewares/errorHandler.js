function mapDatabaseError(error) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const code = String(error.code || "");

  if (code === "ER_DUP_ENTRY" || code === "23505") {
    return {
      statusCode: 409,
      message: "Data yang sama sudah ada. Gunakan nilai yang berbeda.",
    };
  }

  if (
    code === "ER_NO_REFERENCED_ROW_2" ||
    (code === "23503" && error.detail && error.detail.includes("is not present in table"))
  ) {
    return {
      statusCode: 400,
      message: "Data referensi tidak ditemukan atau belum tersedia.",
    };
  }

  if (
    code === "ER_ROW_IS_REFERENCED_2" ||
    (code === "23503" && error.detail && error.detail.includes("is still referenced from table"))
  ) {
    return {
      statusCode: 409,
      message: "Data ini masih terhubung dengan data lain dan belum bisa dihapus.",
    };
  }

  if (code === "23503") {
    return {
      statusCode: 409,
      message: "Pelanggaran relasi data (foreign key constraint).",
    };
  }

  if (code === "ER_BAD_NULL_ERROR" || code === "23502") {
    return {
      statusCode: 400,
      message: "Masih ada field wajib yang belum diisi.",
    };
  }

  return null;
}

function notFoundHandler(request, response) {
  response.status(404).json({
    success: false,
    message: "Route tidak ditemukan.",
  });
}

function errorHandler(error, request, response, next) {
  const mappedDatabaseError = mapDatabaseError(error);
  const statusCode = mappedDatabaseError?.statusCode || error.statusCode || 500;
  const message = mappedDatabaseError?.message || error.message || "Terjadi kesalahan pada server.";
  const shouldLogError = process.env.NODE_ENV !== "test";

  if (shouldLogError && statusCode >= 500) {
    console.error(
      `[${new Date().toISOString()}] ${request.method} ${request.originalUrl} ${statusCode} ${error.stack || error.message || error}`
    );
  }

  response.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack, code: error.code } : {}),
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
