GEMBOK — Play Store Assets (Neobrutalism)
==========================================

Folder ini isinya asset teks/grafis untuk halaman Play Store Gembok.
Semua dibuat sebagai grafis bergaya neobrutalism (bukan screenshot aplikasi
sungguhan) — sesuai token warna & tipografi di dokumen arsitektur (§10).

1) icon/
   - gembok-icon-512x512.png
   - Untuk "App icon" di Play Console. Spesifikasi Google: PNG 512x512,
     32-bit (dengan alpha). Sudah sesuai.

2) feature-graphic/
   - gembok-feature-graphic-1024x500.png
   - Untuk "Feature graphic" di Play Console. Spesifikasi Google: PNG/JPG
     1024x500, tanpa alpha channel. Sudah sesuai (RGB, background solid).

3) screenshots-phone/
   - 6 gambar promosi 1080x1920 (rasio 9:16), bertema satu poin jual per
     gambar: cover, zero-knowledge, enkripsi end-to-end, sinkronisasi,
     emergency kit, dan desain neobrutalism.
   - Ini BUKAN screenshot UI asli — sesuai permintaan, hanya grafis
     teks+ikon. Play Store tetap menerima gambar promosi seperti ini untuk
     slot screenshot, tapi kalau nanti aplikasinya sudah jadi, sebaiknya
     tambahkan minimal beberapa screenshot UI asli juga (Google
     merekomendasikan campuran, dan store listing biasanya konversinya
     lebih baik kalau ada tampilan produk asli).
   - Minimal Play Store: 2 screenshot phone, maksimal 8.

Font yang dipakai: Archivo Black (judul) & Space Grotesk (body) — sama
seperti token tipografi di §10 arsitektur. File font ada di folder
../fonts/ kalau butuh dipakai lagi untuk asset lain.

Yang BELUM dibuat (butuh input dari kamu / di luar cakupan "gambar teks
saja"):
   - Promo video (opsional di Play Console)
   - Ikon adaptif Android (foreground/background layer terpisah untuk
     launcher) — beda dari icon Play Store 512x512 di atas
   - Screenshot UI asli aplikasi
