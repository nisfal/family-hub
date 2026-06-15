# Family Hub Mongo

MVP pusat informasi keluarga besar: pohon keluarga, profil anggota, timeline, agenda, dan album placeholder.

## Menjalankan

Install dependency:

```powershell
npm install
```

Buat file `.env` dari `.env.example`:

```powershell
copy .env.example .env
```

Konfigurasi default untuk MongoDB lokal:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB=family_hub
```

Jalankan aplikasi:

```powershell
node server.js
```

Pastikan MongoDB lokal sudah berjalan di:

```text
mongodb://localhost:27017/
```

Database yang dipakai aplikasi:

```text
family_hub
```

Jika MongoDB atau package `mongodb` belum tersedia, aplikasi otomatis memakai file lokal `data/local-db.json` untuk mode demo.

## Import Data

Data contoh dari `data/silsilah_keluarga_updated.ndjson` akan otomatis di-seed saat server pertama kali berjalan. Seed manual:

```powershell
node scripts/import-seed.js
```

Dengan `.env` default, perintah seed akan mengisi MongoDB lokal `family_hub`.

## Endpoint API

- `GET /api/health`
- `GET /api/members`
- `POST /api/members`
- `GET /api/members/:id`
- `PUT /api/members/:id`
- `DELETE /api/members/:id`
- `GET /api/events`
- `POST /api/events`
- `GET /api/tree`
