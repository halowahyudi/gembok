// Copy for the signup awareness carousel. Casual on purpose and free of
// technical terms; a test enforces the last part.

export type AwarenessSlide = {
  title: string;
  body: string;
  points?: string[];
};

export const AWARENESS_SLIDES: AwarenessSlide[] = [
  {
    title: 'Kunci cuma ada di kamu',
    body: 'Password kamu diacak di HP kamu sendiri dan nggak pernah kami lihat. Aman? Banget. Tapi artinya kamu yang pegang kendali penuh—bukan kami.',
  },
  {
    title: 'Hilang semua = hilang permanen',
    body: 'Kalau kata sandi utama lupa, HP rusak, dan Kit Darurat ikut hilang, datanya nggak bisa balik. Bukan karena kami nggak mau: sistemnya memang nggak nyimpen kunci kamu. Nggak ada yang bisa bukain, termasuk kami.',
  },
  {
    title: 'Simpan Kit Darurat, jangan skip',
    body: 'Pas daftar, kamu bakal dapat Kunci Keamanan dan 24 kata pemulihan. Taruh di tempat aman yang beda dari HP ini.',
    points: [
      'Kunci Keamanan dipakai tiap login di perangkat baru',
      '24 kata pemulihan dipakai kalau lupa kata sandi',
      'Tulis di kertas, simpan di tempat beda dari HP ini',
      'Jangan cuma difoto dan disimpan di HP yang sama',
    ],
  },
  {
    title: 'Kesalahan yang sering kejadian',
    body: 'Masalahnya biasanya bukan di sistemnya, tapi di kebiasaan kita. Hindari ini ya:',
    points: [
      'Simpan Kit Darurat di HP yang sama',
      'Nge-skip konfirmasi padahal belum disimpen',
      'Pake kata sandi yang gampang ditebak',
      'Login di HP pinjaman atau komputer umum',
    ],
  },
  {
    title: 'Install cuma dari toko resmi',
    body: 'Download Gembok cuma dari Google Play atau sumber resmi yang kami umumkan. File APK dari link sembarangan bisa udah dimodif buat nyolong data kamu.',
    points: [
      "Jangan tergiur link 'APK premium gratis'",
      'Cek nama pengembang sebelum install',
      'Jangan install dari file kiriman chat',
    ],
  },
  {
    title: 'Aman itu tanggung jawab bareng',
    body: 'Kami jaga sistemnya sekuat mungkin. Sisanya, kehati-hatian kamu yang nentuin. Kalau ragu, mending berhenti dulu daripada nyesel belakangan.',
  },
];

// Terms that must stay out of user-facing copy (enforced by a test).
export const FORBIDDEN_COPY_TERMS = [
  'supabase',
  'rls',
  'ciphertext',
  'zero-knowledge',
  'two-secret',
  'argon2',
  'postgres',
  'hkdf',
  'aes',
  'enkripsi',
];
