// Turn internal error codes and Supabase errors into Indonesian, non-technical
// text for the UI.
export function authErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  const lower = code.toLowerCase();

  switch (code) {
    case 'EMAIL_CONFIRMATION_REQUIRED':
      return 'Akun dibuat, tapi perlu konfirmasi email. Cek kotak masuk Anda, lalu masuk lagi. Kalau tidak ada email, pastikan konfirmasi email di Supabase Auth sudah dimatikan untuk pengujian.';
    case 'SIGNUP_FAILED':
      return 'Pendaftaran gagal. Coba lagi dalam beberapa saat.';
    case 'VAULT_ID_COLLISION':
      return 'Terjadi kendala teknis saat membuat brankas. Coba lagi.';
    case 'EMAIL_NOT_FOUND':
    case 'ACCOUNT_NOT_FOUND':
      return 'Email ini belum terdaftar di Gembok.';
    case 'INVALID_RECOVERY':
      return 'Frasa pemulihan salah. Periksa kembali 24 kata Anda.';
    case 'INVALID_SECRET_KEY':
    case 'INVALID_SECRET_KEY_LENGTH':
      return 'Kunci keamanan salah. Periksa lagi dari Kit Darurat Anda.';
    case 'INVALID_PASSWORD':
      return 'Kata sandi salah. Coba lagi.';
    case 'INVALID_CREDENTIALS':
      return 'Email, kata sandi, atau kunci keamanan salah.';
    default:
      break;
  }

  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'Email ini sudah terdaftar.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Kata sandi salah. Coba lagi.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Koneksi bermasalah. Periksa jaringan Anda.';
  }
  return 'Terjadi kendala. Silakan coba lagi.';
}

// Same, for vault load/save errors.
export function vaultErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : '';
  const lower = code.toLowerCase();

  if (code === 'SYNC_CONFLICT') {
    return 'Data ini baru berubah di tempat lain. Buka ulang lalu coba lagi.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Koneksi bermasalah. Periksa jaringan Anda.';
  }
  return 'Terjadi kendala saat menyimpan. Silakan coba lagi.';
}
