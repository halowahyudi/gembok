# Gembok — Brankas Password

> Simpan password dengan aman. Hanya kamu yang bisa membukanya.

Gembok adalah brankas digital untuk menyimpan kata sandi (password), PIN, data
kartu, catatan rahasia, dan kode 2FA (Authenticator) — dengan enkripsi menyeluruh
(end-to-end). Semua datamu diacak di HP sendiri sebelum disimpan, jadi tidak ada
satu pun pihak — termasuk kami — yang bisa membacanya.

<p>
  <a href="https://gembok.dev"><strong>Situs web »</strong></a>
  ·
  <a href="https://play.google.com/store/apps/details?id=com.gembok.dev"><strong>Unduh di Google Play »</strong></a>
</p>

---

## English

Gembok is a **zero-knowledge, end-to-end encrypted password manager** built with
React Native + Expo. Your logins, PINs, cards, secure notes, and 2FA codes are
encrypted on your device before they ever leave it — so no one, not even us, can
read them.

- **Only you can unlock it.** Master password + a device-held Security Key (in
  your Emergency Kit) open your vault; the server never sees plaintext.
- **Fast unlock.** One-tap biometric unlock; auto-locks when idle or in the
  background.
- **No ads, no tracking.**
- **Honest security.** If your master password, Security Key, and 24-word
  recovery phrase are all lost, your vault cannot be recovered by anyone.

### Tech

React Native · Expo (expo-router) · Supabase · Argon2id · HKDF-SHA256 ·
AES-256-GCM · TOTP (RFC 6238) · zustand · TanStack Query · Neobrutalism UI

```bash
npm install        # install dependencies
npm start          # start dev server
npm run typecheck  # TypeScript check
npm run lint       # ESLint
npm test           # crypto + vault vector tests
```

---

## Kenapa Gembok?

- **Hanya kamu yang bisa membuka.** Kata sandi dan kuncimu tidak pernah dikirim
  dalam bentuk asli.
- **Dua lapis rahasia.** Selain kata sandi utama, ada Kunci Keamanan yang hanya
  ada di perangkatmu dan Kit Darurat.
- **Buka cepat dengan sidik jari.** Sekali sentuh, langsung terbuka.
- **Terkunci otomatis.** Brankas mengunci sendiri saat aplikasi dipindah ke
  belakang atau setelah lama tidak dipakai.
- **Tanpa iklan dan tanpa pelacakan.**

## Yang Bisa Disimpan

- **Login** — username/email, password, alamat situs, catatan.
- **PIN** — PIN ATM, PIN HP, kode pintu, dan sejenisnya.
- **Kartu** — nama pemegang, nomor kartu, masa berlaku, CVV, dan PIN.
- **Catatan aman** — apa pun yang perlu disimpan rahasia.
- **Authenticator** — kode 2FA (TOTP) dari QR atau manual, dihitung di
  perangkat. Secret-nya disimpan di server **hanya dalam bentuk terenkripsi**;
  server tidak bisa membacanya.

## Cara Mulai

1. Buat akun dengan email dan kata sandi utama.
2. Simpan Kit Darurat (Kunci Keamanan + 24 kata pemulihan) di tempat aman.
3. Mulai simpan data. Buka lagi cukup pakai sidik jari.

> **Perlu diketahui:** karena hanya kamu yang memegang kuncinya, jika kata sandi
> utama, Kunci Keamanan, dan 24 kata pemulihan semuanya hilang, isi brankas
> tidak dapat dipulihkan oleh siapa pun. Simpan Kit Darurat di tempat yang aman
> dan terpisah dari HP.

---

## Keamanan

- **Zero-knowledge** — server tidak pernah menerima isi brankas maupun kata
  sandi dalam bentuk asli.
- **Enkripsi menyeluruh** — data diacak di perangkat dengan AES-256-GCM sebelum
  dikirim.
- **KDF kuat** — Argon2id (native, dengan fallback JS) untuk menaikkan biaya
  serangan offline.
- **Kunci di perangkat** — Kunci Keamanan tersimpan di perangkatmu, tidak pernah
  ke server.
- **Pemulihan 24 kata** — bila lupa kata sandi, frasa pemulihan di Kit Darurat
  mengembalikan aksesmu.
- **Keamanan perangkat** — auto-lock, blokir screenshot, izin OS minimal.

## Tech Stack

| Lapisan | Teknologi |
| --- | --- |
| Client | React Native + Expo (expo-router) |
| Backend | Supabase (Auth, Postgres, Edge Functions) |
| Kripto | Argon2id, HKDF-SHA256, AES-256-GCM, TOTP (RFC 6238) |
| State | zustand + TanStack Query |
| UI | Neobrutalism (Space Grotesk / Archivo Black) |
| Build & rilis | EAS Build + EAS Submit |

## Development

```bash
npm install        # pasang dependencies
npm start          # jalankan dev server
npm run typecheck  # cek TypeScript
npm run lint       # cek ESLint
npm test           # jalankan test (kripto + vektor vault)
```

Struktur proyek singkat:

```
app/        rute expo-router (auth, emergency kit, vault, item/*)
src/
  crypto/   kdf, keys, cipher, recovery
  auth/     client Supabase, akun, pemulihan
  vault/    model item, kripto item, repository, store
  totp/     kode 2FA (RFC 6238)
  device/   buka dengan biometrik, auto-lock
  features/ awareness carousel, form vault + input rahasia
  theme/    token + komponen Neobrutalism
  lib/      env, id, validasi
supabase/   migrasi database + Edge Functions
modules/    modul native crypto (Android/iOS)
```

---

## Lisensi

Proyek ini bersifat **closed source** dan tidak memublikasikan kode klien.
Untuk detail keamanan dan kebijakan rahasia, lihat [situs web Gembok](https://gembok.dev).
