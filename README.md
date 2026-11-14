# FinWise

Pendamping keuangan untuk anak muda Indonesia, dengan tiga fungsi utama:

1. **Asesmen pinjaman pribadi**, tiga langkah berurutan:
   - **CEK** (kondisi sekarang): kondisi keuangan, uang masuk dan keluar, kondisi utang yang sudah ada, dana darurat, dan rencana hemat.
   - **PILAH** (saat butuh dana): rencana pinjaman (untuk apa, berapa, berapa lama), dampaknya dan kesiapan berutang, cara meminjam lebih sedikit, lalu semua pindar berizin dengan patokan harga bank, koperasi, dan batas OJK. Tidak ada fitur yang dikunci.
   - **PULIH** (setelah berutang): analisis tiap pinjaman, jadwal bayar, langkah kalau tidak sanggup bayar, urutan pelunasan, dan cek "pinjam untuk bayar pinjaman".
2. **Database pinjol**: legalitas aplikasi pinjaman dari daftar OJK dan Satgas PASTI, profil, ulasan, dan statistik industri.
3. **Kalkulator pinjaman**: cicilan, total yang dikembalikan, dan bunga sebenarnya, dengan tarif pindar berizin termurah (batas OJK sebagai skenario terburuk).

Ada juga **game Lolos Jebakan Pinjol** (±5 menit): kartu kilat, lalu "Sebulan Bertahan" (sebulan sebagai Dimas lewat notifikasi HP dengan mini-game), lalu kartu kilat yang sama untuk mengukur kenaikan pemahaman; dipakai untuk uji coba pengguna. Ada juga permainan cepat 60 detik "Legal atau ilegal?".

Prototipe Tim 20 elevATE. **Bukan nasihat keuangan.**

**Web:** https://shafwanugraha.github.io/finwise/

## Status

- Prototipe untuk validasi pengguna.
- Data yang diisi pengguna hanya tersimpan di browser masing-masing (localStorage). Belum ada akun atau database; untuk pindah perangkat, pakai "Unduh data (.json)" di CEK lalu "Pakai data dari file" di perangkat lain.
- Penjelasan AI hanya aktif saat dibuka sebagai artifact di claude.ai. Di GitHub Pages, bantuan memakai jawaban berbasis aturan dan kamus istilah.

## Struktur

| Path | Isi |
|---|---|
| `src/index.html`, `src/app.css` | Kerangka halaman dan gaya |
| `src/engine.js` | Mesin hitung: batas cicilan aman (DSR), skor kesehatan, biaya pinjaman, plafon biaya OJK |
| `src/app/*.js` | Halaman dan interaksi. Digabung berurutan sesuai nama file ke dalam satu fungsi |
| `src/data.js` | Data fiktif untuk Tantangan 3 Hari |
| `src/realdata.js` | Data tim: tarif RIPLAY 20 pindar dan ringkasan ulasan (tanpa kutipan dan nama) |
| `src/ojkdata.js` | Daftar pindar berizin OJK, daftar ilegal Satgas PASTI, statistik LPBBTI |
| `tools/` | Skrip pembuat `realdata.js` dan `ojkdata.js` dari data mentah di `data/raw/` |
| `docs/index.html` | Hasil build, satu file mandiri, yang ditayangkan GitHub Pages |
| `tests/e2e.py` | Uji otomatis (Playwright): isi data, buka semua halaman, cek aksesibilitas |

## Cara build dan uji

```bash
python3 build.py              # menghasilkan docs/index.html
python3 tests/e2e.py --axe    # opsional; butuh Playwright (dan axe-core untuk --axe)
```

Setiap mengubah isi `src/`, jalankan `build.py` lalu commit `src/` dan `docs/` bersama-sama.

## Data

| Sumber | Periode |
|---|---|
| Daftar LPBBTI berizin OJK (97 penyelenggara) | Januari 2025 |
| Daftar pinjol ilegal Satgas PASTI (951 entri) | April 2026 |
| Statistik LPBBTI OJK | Desember 2025 |
| Tarif RIPLAY 20 pindar (data tim) | per 30 April 2026 |
| Ulasan Google Play (hanya ringkasan) | data tim |

Data mentah tidak di-commit, karena berisi ulasan asli beserta nama pengulas. Untuk membuat ulang file data, taruh file tim di `data/raw/` dan file OJK di `data/raw/Data OJK/`, lalu jalankan `python3 -I tools/realdata.py` dan `python3 -I tools/ojkdata.py`.

## Cek legalitas resmi

Kontak OJK 157 · WhatsApp 081-157-157-157
