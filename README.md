# QR Ordering

Web-based QR ordering system for restaurant customers and admin management. Project ini memakai Node.js, Express, MySQL, serta frontend terpisah untuk pelanggan dan admin, tetapi tetap disajikan dari backend yang sama.

## Fitur Utama

- Halaman pelanggan untuk melihat menu, menambah ke keranjang, checkout, dan memantau status order
- Panel admin untuk login, mengelola kategori, menu, banner, diskon, dan laporan
- REST API untuk alur publik dan admin
- Upload gambar dengan mode penyimpanan yang bisa diatur
- Health check dan readiness endpoint untuk kebutuhan monitoring
- Cookie-based admin session dan rate limit pada login admin

## Struktur Project

```text
frontend/
  user/        # halaman pelanggan
  admin/       # panel admin
  shared/      # asset shared frontend
backend/
  server.js    # entry point utama
  scripts/     # util CLI dan test script
  src/
    app.js
    config/
    middlewares/
    routes/
    utils/
database/
  schema.sql
  seeds.sql
public/
  uploads/     # upload lokal
```

## Menjalankan Project Secara Lokal

1. Install dependency.

```bash
npm install
```

2. Buat file `.env` berdasarkan `.env.example`.
3. Sesuaikan konfigurasi database pada `.env`.
4. Import `database/schema.sql`.
5. Import `database/seeds.sql`.
6. Jalankan server development.

```bash
npm run dev
```

7. Buka aplikasi:

```text
User  : http://localhost:4000/
Admin : http://localhost:4000/admin
API   : http://localhost:4000/api
```

## Script Penting

- `npm run dev` menjalankan backend dengan watch mode
- `npm run start` menjalankan backend biasa
- `npm run check:backend` memeriksa sintaks file backend
- `npm run check:frontend` memeriksa sintaks file frontend
- `npm run test:smoke` menjalankan smoke test endpoint penting
- `npm run test:api` menjalankan test API dasar untuk alur admin
- `npm run hash:password -- <password>` membuat hash bcrypt untuk password admin

Contoh:

```bash
npm run hash:password -- admin123
```

## Environment Variable Penting

Beberapa konfigurasi yang paling sering dipakai:

- `PORT` untuk port backend, default `4000`
- `FRONTEND_ORIGIN` untuk origin frontend yang diizinkan
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` untuk koneksi database
- `JWT_SECRET` untuk token dan autentikasi admin
- `TRUST_PROXY` untuk deployment di balik reverse proxy
- `UPLOAD_STORAGE_MODE` dengan nilai `local` atau `external-url`
- `MAX_UPLOAD_IMAGE_BYTES` untuk batas ukuran upload gambar
- `ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS` dan `ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS` untuk proteksi login admin

## Catatan Arsitektur

- Backend menyajikan frontend user, frontend admin, asset shared, dan API dari origin yang sama
- Route root `/` akan mengarahkan ke `/user/pages/index.html`
- Route `/admin` akan mengarahkan ke `/admin/pages/login.html`
- API default berjalan di `/api`
- Frontend akan memakai `${window.location.origin}/api` saat dijalankan dari host HTTP/HTTPS yang valid

## Endpoint Operasional

- `GET /api/live` untuk liveness check
- `GET /api/ready` untuk readiness check database
- `GET /api/health` untuk ringkasan status aplikasi dan database

## Catatan Deploy

- Set `NODE_ENV=production` saat production
- Ganti `JWT_SECRET` dengan nilai acak yang panjang dan aman
- Pastikan `FRONTEND_ORIGIN` sesuai domain final aplikasi
- Jika berada di balik reverse proxy atau platform hosting, set `TRUST_PROXY=1`
- Saat production, tentukan `UPLOAD_STORAGE_MODE` secara eksplisit
- Untuk storage sementara pada hosting, pertimbangkan `external-url` atau object storage

## Keamanan dan Operasional

- Login admin dibatasi default `5` percobaan gagal per `15 menit`
- Session admin memakai cookie `httpOnly`, bukan `localStorage`
- Upload gambar dibatasi ke MIME gambar yang dikenal
- Logging request bisa diatur lewat `ENABLE_REQUEST_LOGS` dan `LOG_HEALTHCHECK_REQUESTS`

## Lisensi

Belum ada lisensi yang ditetapkan untuk repository ini.
