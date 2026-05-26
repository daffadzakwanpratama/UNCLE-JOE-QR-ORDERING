# QR Ordering

Project ini sekarang dipisah menjadi:

- `frontend/user` untuk halaman pelanggan
- `frontend/admin` untuk panel admin
- `backend/src` untuk entry app, config, middleware, dan route API
- `backend/scripts` untuk util CLI seperti hash password
- `database` untuk struktur dan seed SQL

Struktur backend yang sekarang:

```text
backend/
  server.js
  scripts/
    hash-password.js
  src/
    app.js
    server.js
    config/
      db.js
    middlewares/
      errorHandler.js
    routes/
      index.js
      publicRoutes.js
      authRoutes.js
      categoryRoutes.js
      menuRoutes.js
      orderRoutes.js
      bannerRoutes.js
      discountRoutes.js
      reportRoutes.js
```

## Setup singkat

1. Install dependency

```bash
npm install
```

2. Buat file `.env` dari `.env.example`

3. Jalankan `database/schema.sql`

4. Jalankan `database/seeds.sql`

5. Start backend

```bash
npm run dev
```

6. Buka aplikasi

```text
User  : http://localhost:4000/
Admin : http://localhost:4000/admin
API   : http://localhost:4000/api
```

## Script penting

- `npm run dev` menjalankan backend dengan watch mode
- `npm run start` menjalankan backend normal
- `npm run check:backend` memeriksa sintaks file backend
- `npm run check:frontend` memeriksa sintaks file frontend user
- `npm run test:smoke` mengecek health, auth dasar, dan endpoint publik/protected
- `npm run test:api` mengecek login admin, validasi input, serta CRUD dasar kategori dan menu
- `npm run hash:password -- <password>` membuat hash bcrypt untuk password admin

Contoh:

```bash
npm run hash:password -- admin123
```

## Catatan

- Backend sekarang juga menyajikan frontend user, frontend admin, dan asset shared dalam origin yang sama.
- API default mengarah ke `http://localhost:4000/api`
- Frontend admin dan user sekarang sama-sama dipisah ke layer `api`, `shared`, dan `pages`

## Kesiapan Hosting Tahap 1

- Untuk hosting production, set `NODE_ENV=production`.
- Saat production, `FRONTEND_ORIGIN` wajib diisi domain frontend yang spesifik, misalnya `https://your-domain.com`.
- Frontend sekarang akan otomatis memakai `${window.location.origin}/api` saat dijalankan lewat `http` atau `https`, jadi tidak lagi bergantung ke `localhost`.
- Fallback `http://localhost:4000/api` hanya dipakai untuk pengembangan lokal seperti `file://`, `localhost`, atau `127.0.0.1`.

## Checklist Deploy Sederhana

1. Siapkan `.env` production dengan nilai yang aman.
2. Ganti `JWT_SECRET` dengan string acak yang panjang.
3. Pastikan `FRONTEND_ORIGIN` sesuai domain final aplikasi.
4. Import `database/schema.sql` dan `database/seeds.sql` ke database hosting.
5. Jalankan backend dengan `npm run start`.
6. Jika aplikasi ada di balik reverse proxy atau platform hosting, set `TRUST_PROXY=1`.

## Proteksi Login Admin

- Login admin sekarang dibatasi secara default maksimal `5` percobaan gagal per `15 menit` untuk kombinasi IP dan username.
- Nilai ini bisa diatur lewat:
  - `ADMIN_LOGIN_RATE_LIMIT_WINDOW_MS`
  - `ADMIN_LOGIN_RATE_LIMIT_MAX_ATTEMPTS`
- Sesi admin sekarang mengandalkan cookie `httpOnly` dari server. Frontend tidak lagi menyimpan token admin sensitif di `localStorage`.
- Untuk production, cookie admin bisa diatur lewat:
  - `ADMIN_COOKIE_DOMAIN`
  - `ADMIN_COOKIE_SAME_SITE`
  - `ADMIN_COOKIE_SECURE`

## Upload Gambar

- Upload gambar lokal sekarang dibatasi hanya untuk MIME gambar yang dikenal.
- Ukuran maksimum default adalah `2MB` dan bisa diatur lewat `MAX_UPLOAD_IMAGE_BYTES`.
- Mode storage sekarang eksplisit lewat `UPLOAD_STORAGE_MODE`:
  - `local` untuk menyimpan file ke `public/uploads`
  - `external-url` untuk hanya menerima URL gambar eksternal
- Saat `NODE_ENV=production`, `UPLOAD_STORAGE_MODE` wajib diisi agar strategi storage tidak ambigu.
- Untuk hosting dengan storage sementara, jangka panjang sebaiknya gunakan `external-url` atau pindahkan ke object storage.

## Monitoring dan Operasional

- Endpoint operasional yang tersedia:
  - `GET /api/live` untuk liveness check ringan
  - `GET /api/ready` untuk readiness check yang memastikan database siap
  - `GET /api/health` untuk ringkasan status aplikasi dan database
- Logging request bisa diatur lewat:
  - `ENABLE_REQUEST_LOGS=true|false`
  - `LOG_HEALTHCHECK_REQUESTS=true|false`
