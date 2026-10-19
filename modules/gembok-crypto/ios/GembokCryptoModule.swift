import ExpoModulesCore
import Argon2Swift

// Native crypto core. Phase 1 exposes Argon2id; AEAD and session handling land
// here next. Salt and hash travel as hex strings.
public class GembokCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GembokCrypto")

    AsyncFunction("deriveArgon2id") { (password: String, saltHex: String, t: Int, m: Int, p: Int, dkLen: Int) -> String in
      let result = try Argon2Swift.hashPasswordBytes(
        password: password,
        salt: Salt(bytes: Data(try Self.hexToBytes(saltHex))),
        iterations: t,
        memory: m,
        parallelism: p,
        length: dkLen,
        type: .id,
        version: .version13
      )
      return Self.bytesToHex(result.rawHashBytes())
    }
  }

  private static func hexToBytes(_ hex: String) throws -> [UInt8] {
    let clean = hex.hasPrefix("0x") ? String(hex.dropFirst(2)) : hex
    let chars = Array(clean)
    guard chars.count % 2 == 0 else { throw GembokCryptoError.invalidHex }
    var out = [UInt8]()
    out.reserveCapacity(chars.count / 2)
    var index = 0
    while index < chars.count {
      guard let hi = chars[index].hexDigitValue, let lo = chars[index + 1].hexDigitValue else {
        throw GembokCryptoError.invalidHex
      }
      out.append(UInt8(hi << 4 | lo))
      index += 2
    }
    return out
  }

  private static func bytesToHex(_ bytes: [UInt8]) -> String {
    let table = Array("0123456789abcdef")
    var out = String()
    out.reserveCapacity(bytes.count * 2)
    for byte in bytes {
      out.append(table[Int(byte >> 4)])
      out.append(table[Int(byte & 0x0f)])
    }
    return out
  }
}

enum GembokCryptoError: Error {
  case invalidHex
}
