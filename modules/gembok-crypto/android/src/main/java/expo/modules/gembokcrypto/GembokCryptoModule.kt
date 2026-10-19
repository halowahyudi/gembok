package expo.modules.gembokcrypto

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import com.lambdapioneer.argon2kt.Argon2Kt
import com.lambdapioneer.argon2kt.Argon2Mode
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.Mac
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

// Native crypto core. It owns the vault key (userKey) so it never reaches JS.
// Heavy work uses AsyncFunction so the JS/UI thread stays free.
class GembokCryptoModule : Module() {
  @Volatile private var userKey: ByteArray? = null
  private val random = SecureRandom()

  override fun definition() = ModuleDefinition {
    Name("GembokCrypto")

    Function("isUnlocked") { userKey != null }

    Function("lock") {
      userKey?.fill(0)
      userKey = null
    }

    AsyncFunction("createAccount") { password: String, secretKeyHex: String, saltHex: String, t: Int, m: Int, p: Int, recoveryEntropyHex: String ->
      val salt = hexToBytes(saltHex)
      val secretKey = hexToBytes(secretKeyHex)
      val recovery = hexToBytes(recoveryEntropyHex)
      val masterKey = deriveMasterKey(password, secretKey, salt, t, m, p)
      val encMasterKey = hkdf(masterKey, salt, "gembok/v1/enc".toByteArray(), 32)
      val authSecret = hkdf(masterKey, salt, "gembok/v1/auth".toByteArray(), 32)
      val recoveryEncKey = hkdf(recovery, ByteArray(0), "gembok/v1/recovery".toByteArray(), 32)
      val secretKeyVerifier = hkdf(secretKey, ByteArray(0), "gembok/v1/secret-key-verifier".toByteArray(), 32)

      val key = randomBytes(32)
      val wrapped = seal(encMasterKey, key, "gembok/v1/user-key".toByteArray())
      val wrappedRecovery = seal(recoveryEncKey, key, "gembok/v1/user-key-recovery".toByteArray())
      userKey = key

      mapOf(
        "authSecret" to bytesToHex(authSecret),
        "protectedUserKey" to bytesToHex(wrapped.first + wrapped.second),
        "protectedUserKeyRecovery" to bytesToHex(wrappedRecovery.first + wrappedRecovery.second),
        "secretKeyVerifier" to bytesToHex(secretKeyVerifier),
      )
    }

    AsyncFunction("deriveAuthSecret") { password: String, secretKeyHex: String, saltHex: String, t: Int, m: Int, p: Int ->
      val salt = hexToBytes(saltHex)
      val masterKey = deriveMasterKey(password, hexToBytes(secretKeyHex), salt, t, m, p)
      bytesToHex(hkdf(masterKey, salt, "gembok/v1/auth".toByteArray(), 32))
    }

    AsyncFunction("openVault") { password: String, secretKeyHex: String, saltHex: String, t: Int, m: Int, p: Int, protectedUserKeyHex: String ->
      val salt = hexToBytes(saltHex)
      val masterKey = deriveMasterKey(password, hexToBytes(secretKeyHex), salt, t, m, p)
      val encMasterKey = hkdf(masterKey, salt, "gembok/v1/enc".toByteArray(), 32)
      val packed = hexToBytes(protectedUserKeyHex)
      userKey = open(encMasterKey, packed.copyOfRange(0, 12), packed.copyOfRange(12, packed.size), "gembok/v1/user-key".toByteArray())
      true
    }

    AsyncFunction("openVaultWithRecovery") { recoveryEntropyHex: String, protectedUserKeyRecoveryHex: String ->
      val recovery = hexToBytes(recoveryEntropyHex)
      val recoveryEncKey = hkdf(recovery, ByteArray(0), "gembok/v1/recovery".toByteArray(), 32)
      val packed = hexToBytes(protectedUserKeyRecoveryHex)
      userKey = open(recoveryEncKey, packed.copyOfRange(0, 12), packed.copyOfRange(12, packed.size), "gembok/v1/user-key-recovery".toByteArray())
      true
    }

    AsyncFunction("deriveRecoveryAuthHash") { recoveryEntropyHex: String ->
      bytesToHex(hkdf(hexToBytes(recoveryEntropyHex), ByteArray(0), "gembok/v1/recovery-auth".toByteArray(), 32))
    }

    // Re-wrap the session userKey with a new password/secret key (password change
    // or recovery). Returns authSecret + the new wrapped key.
    AsyncFunction("rewrapUserKey") { password: String, secretKeyHex: String, saltHex: String, t: Int, m: Int, p: Int ->
      val key = userKey ?: throw IllegalStateException("locked")
      val salt = hexToBytes(saltHex)
      val masterKey = deriveMasterKey(password, hexToBytes(secretKeyHex), salt, t, m, p)
      val encMasterKey = hkdf(masterKey, salt, "gembok/v1/enc".toByteArray(), 32)
      val authSecret = hkdf(masterKey, salt, "gembok/v1/auth".toByteArray(), 32)
      val wrapped = seal(encMasterKey, key, "gembok/v1/user-key".toByteArray())
      mapOf(
        "authSecret" to bytesToHex(authSecret),
        "protectedUserKey" to bytesToHex(wrapped.first + wrapped.second),
      )
    }

    AsyncFunction("sealItem") { aad: String, plaintextHex: String ->
      val key = userKey ?: throw IllegalStateException("locked")
      val sealed = seal(key, hexToBytes(plaintextHex), aad.toByteArray())
      mapOf("iv" to bytesToHex(sealed.first), "ciphertext" to bytesToHex(sealed.second))
    }

    AsyncFunction("openItem") { aad: String, ivHex: String, ciphertextHex: String ->
      val key = userKey ?: throw IllegalStateException("locked")
      bytesToHex(open(key, hexToBytes(ivHex), hexToBytes(ciphertextHex), aad.toByteArray()))
    }

    // Biometric path: the device key lives in the Android Keystore and never
    // leaves it; JS only stores the opaque wrapped blob.
    AsyncFunction("enrollDevice") {
      val key = userKey ?: throw IllegalStateException("locked")
      val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
      ks.deleteEntry(KEY_ALIAS)
      val deviceKey = getOrCreateDeviceKey()
      val sealed = sealWithKey(deviceKey, key, "gembok/v1/device-user-key".toByteArray())
      bytesToHex(sealed.first + sealed.second)
    }

    AsyncFunction("unlockDevice") { wrapped: String ->
      val deviceKey = getOrCreateDeviceKey()
      val packed = hexToBytes(wrapped)
      userKey = openWithKey(
        deviceKey,
        packed.copyOfRange(0, 12),
        packed.copyOfRange(12, packed.size),
        "gembok/v1/device-user-key".toByteArray(),
      )
      true
    }

    AsyncFunction("clearDevice") {
      val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
      ks.deleteEntry(KEY_ALIAS)
    }
  }

  private fun getOrCreateDeviceKey(): SecretKey {
    val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (ks.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    generator.init(
      KeyGenParameterSpec.Builder(
        KEY_ALIAS,
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
      )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256)
        .build(),
    )
    return generator.generateKey()
  }

  private fun sealWithKey(key: SecretKey, plaintext: ByteArray, aad: ByteArray): Pair<ByteArray, ByteArray> {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, key)
    cipher.updateAAD(aad)
    return cipher.iv to cipher.doFinal(plaintext)
  }

  private fun openWithKey(key: SecretKey, iv: ByteArray, ciphertext: ByteArray, aad: ByteArray): ByteArray {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv))
    cipher.updateAAD(aad)
    return cipher.doFinal(ciphertext)
  }

  private fun deriveMasterKey(password: String, secretKey: ByteArray, salt: ByteArray, t: Int, m: Int, p: Int): ByteArray {
    val derived = Argon2Kt().hash(
      mode = Argon2Mode.ARGON2_ID,
      password = password.toByteArray(Charsets.UTF_8),
      salt = salt,
      tCostInIterations = t,
      mCostInKibibyte = m,
      parallelism = p,
      hashLengthInBytes = 32,
    ).rawHashAsByteArray()
    val ikm = derived + secretKey
    val masterKey = hkdf(ikm, salt, "gembok/v1/master".toByteArray(), 32)
    derived.fill(0)
    ikm.fill(0)
    return masterKey
  }

  private fun hkdf(ikm: ByteArray, salt: ByteArray, info: ByteArray, length: Int): ByteArray {
    // HMAC rejects an empty key, and RFC 5869 defaults an absent salt to zeros,
    // which HMAC treats identically. Use a zero-filled key when salt is empty.
    val effectiveSalt = if (salt.isEmpty()) ByteArray(32) else salt
    val mac = Mac.getInstance("HmacSHA256")
    mac.init(SecretKeySpec(effectiveSalt, "HmacSHA256"))
    val prk = mac.doFinal(ikm)
    val out = ByteArray(length)
    var block = ByteArray(0)
    var counter = 1
    var pos = 0
    while (pos < length) {
      mac.init(SecretKeySpec(prk, "HmacSHA256"))
      mac.update(block)
      mac.update(info)
      mac.update(counter.toByte())
      block = mac.doFinal()
      val copy = minOf(block.size, length - pos)
      System.arraycopy(block, 0, out, pos, copy)
      pos += copy
      counter++
    }
    return out
  }

  private fun seal(key: ByteArray, plaintext: ByteArray, aad: ByteArray): Pair<ByteArray, ByteArray> {
    val iv = randomBytes(12)
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, iv))
    cipher.updateAAD(aad)
    return iv to cipher.doFinal(plaintext)
  }

  private fun open(key: ByteArray, iv: ByteArray, ciphertext: ByteArray, aad: ByteArray): ByteArray {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding")
    cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), GCMParameterSpec(128, iv))
    cipher.updateAAD(aad)
    return cipher.doFinal(ciphertext)
  }

  private fun randomBytes(length: Int): ByteArray {
    val out = ByteArray(length)
    random.nextBytes(out)
    return out
  }

  private fun hexToBytes(hex: String): ByteArray {
    val clean = hex.removePrefix("0x")
    val out = ByteArray(clean.length / 2)
    for (i in out.indices) {
      val hi = Character.digit(clean[i * 2], 16)
      val lo = Character.digit(clean[i * 2 + 1], 16)
      out[i] = ((hi shl 4) + lo).toByte()
    }
    return out
  }

  private fun bytesToHex(bytes: ByteArray): String {
    val sb = StringBuilder(bytes.size * 2)
    for (b in bytes) {
      sb.append(HEX[(b.toInt() shr 4) and 0x0f])
      sb.append(HEX[b.toInt() and 0x0f])
    }
    return sb.toString()
  }

  companion object {
    private const val KEY_ALIAS = "gembok.device-key"
    private val HEX = "0123456789abcdef".toCharArray()
  }
}
