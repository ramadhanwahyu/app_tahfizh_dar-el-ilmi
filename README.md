# Aplikasi Setoran Hafalan Santri

Aplikasi pencatatan setoran hafalan (Setor / Belum Setor) untuk ustadz per halaqah,
dengan backend Google Apps Script + Google Sheets, frontend HTML/CSS/JS murni.

## Struktur Proyek
```
setoran-hafalan/
├── backend/
│   └── Code.gs        → kode Apps Script (backend/API)
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

---

## LANGKAH 1 — Setup Google Sheets + Apps Script

1. Buka [sheets.google.com](https://sheets.google.com) → buat spreadsheet baru.
   Beri nama misalnya **"Database Setoran Hafalan"**.
2. Klik **Extensions > Apps Script**.
3. Hapus semua kode default di `Code.gs`, lalu **copy-paste seluruh isi**
   file `backend/Code.gs` dari proyek ini.
4. Simpan (Ctrl+S / ikon disket), beri nama project misalnya "Setoran Hafalan API".
5. Kembali ke Spreadsheet (refresh halaman). Akan muncul menu baru
   **"Setoran Hafalan"** di menu bar.
6. Klik **Setoran Hafalan > 1. Setup Sheet (jalankan sekali)**.
   - Saat pertama kali run, Google akan minta izin akses (Authorize) —
     klik **Continue**, pilih akun, lalu **Allow**.
   - Ini akan otomatis membuat 3 sheet: `Santri`, `Akun_Ustadz`, `Setoran`.

## LANGKAH 2 — Isi Data Santri

Buka sheet **Santri**, isi manual:

| ID | Nama | Halaqah |
|----|------|---------|
| S001 | Ahmad Fauzi | Halaqah Ustadz Wahyu |
| S002 | Budi Santoso | Halaqah Ustadz Wahyu |
| S003 | Citra Aulia | Halaqah Ustadz Rahman |

> ID cukup diisi manual berurutan (S001, S002, dst) — ini hanya perlu unik per santri.
> Kolom **Halaqah** harus **sama persis penulisannya** dengan kolom Halaqah di sheet Akun_Ustadz (case-sensitive untuk kerapian, meski pencocokan sudah di-trim spasi).

## LANGKAH 3 — Buat Akun Ustadz

Buka sheet **Akun_Ustadz**, isi kolom **Username**, **Password** (sementara, plain text),
**Nama Ustadz**, **Halaqah**:

| Username | Password | PasswordHash | Nama Ustadz | Halaqah |
|----------|----------|--------------|-------------|---------|
| wahyu | rahasia123 | *(kosongkan)* | Ustadz Wahyu | Halaqah Ustadz Wahyu |
| rahman | sandi456 | *(kosongkan)* | Ustadz Rahman | Halaqah Ustadz Rahman |

Setelah semua akun diisi, jalankan menu **Setoran Hafalan > 2. Hash Password Baru**.
- Ini akan mengubah kolom Password menjadi hash (terenkripsi) di kolom `PasswordHash`,
  dan mengosongkan kolom Password asli demi keamanan.
- Setiap kali menambah ustadz baru / ganti password, isi kolom **Password** lagi lalu
  jalankan menu ini lagi.

## LANGKAH 4 — Deploy sebagai Web App

1. Di Apps Script editor, klik **Deploy > New deployment**.
2. Klik ikon gear ⚙️ di samping "Select type" → pilih **Web app**.
3. Isi:
   - **Execute as:** Me (akun kamu)
   - **Who has access:** Anyone
4. Klik **Deploy**, lalu **Authorize access** lagi jika diminta.
5. Salin **Web app URL** yang muncul (bentuknya seperti
   `https://script.google.com/macros/s/xxxxxxx/exec`).

> ⚠️ Setiap kali kamu **mengubah kode Code.gs**, kamu harus buat deployment baru
> (Deploy > Manage deployments > Edit > New version) supaya perubahan aktif di URL yang sama.

## LANGKAH 5 — Hubungkan Frontend ke Backend

1. Buka file `frontend/script.js`.
2. Cari baris paling atas:
   ```js
   const API_URL = "https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT/exec";
   ```
3. Ganti dengan URL Web App yang kamu salin di Langkah 4.

## LANGKAH 6 — Jalankan Frontend

Frontend adalah file statis (HTML/CSS/JS) — bisa dijalankan dengan cara apapun:

- **Paling mudah (lokal):** buka langsung `frontend/index.html` di browser.
- **Hosting gratis:** upload folder `frontend/` ke GitHub Pages, Netlify, atau
  Google Sites/Firebase Hosting supaya bisa diakses ustadz dari HP masing-masing.

Login menggunakan username & password yang sudah dibuat di Langkah 3.

---

## Cara Kerja Fitur

- **Input Setoran** — ustadz login, otomatis melihat daftar santri di halaqahnya.
  Klik nama santri untuk toggle status Setor / Belum Setor. Ada kolom pencarian
  untuk menandai santri dari halaqah lain (misal saat menggantikan ustadz lain).
- **Rekap Harian/Bulanan** — pilih tanggal atau bulan, sistem menampilkan
  daftar & ringkasan (total, sudah setor, belum setor) khusus halaqah ustadz
  yang login.
- **Export Excel** — tombol "Export Excel (CSV)" mengunduh data rekap yang
  sedang ditampilkan dalam format **CSV** (terbuka otomatis dengan rapi di
  Microsoft Excel / Google Sheets — ini cara paling ringan & stabil untuk
  export dari Apps Script tanpa proses konversi file yang berat di server).

## Catatan Keamanan

- Password disimpan dalam bentuk **hash SHA-256**, bukan plain text.
- Akses Web App bersifat publik (siapa saja bisa memanggil API), tapi
  seluruh operasi input tetap memerlukan **login valid** (username+password)
  sebelum bisa menyimpan data — cukup aman untuk skala pesantren.
- Untuk keamanan lebih tinggi (misalnya sesi expired otomatis, rate-limiting),
  bisa ditambahkan sebagai pengembangan lanjutan.

## Pengembangan Lanjutan (opsional)
- Tambah halaman admin untuk kelola data santri via UI (saat ini diisi
  manual langsung di Google Sheets).
- Tambah reset password mandiri via email.
- Tambah grafik ringkasan per santri (progress setoran bulanan).
- Tambah fitur input tanggal susulan (saat ini dikunci hanya untuk hari ini).
