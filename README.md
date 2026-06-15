# Family Hub Mongo

MVP pusat informasi keluarga besar: pohon keluarga, profil anggota, timeline, agenda, dan album placeholder.

## Menjalankan

```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:27017"
$env:MONGODB_DB="family_hub"
node server.js
```

Jika package `mongodb` belum terpasang, jalankan:

```powershell
npm install
```

Untuk demo tanpa MongoDB, aplikasi otomatis memakai file lokal `data/local-db.json`.

## Import Data

Data contoh dari `data/silsilah_keluarga_updated.ndjson` akan otomatis di-seed saat server pertama kali berjalan. Seed manual:

```powershell
node scripts/import-seed.js
```

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
