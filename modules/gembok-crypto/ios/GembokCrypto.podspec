Pod::Spec.new do |s|
  s.name           = 'GembokCrypto'
  s.version        = '0.1.0'
  s.summary        = 'Native crypto core for Gembok'
  s.description    = 'Argon2id and AEAD primitives for Gembok'
  s.author         = 'Gembok'
  s.homepage       = 'https://gembok.dev'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://gembok.dev' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'Argon2Swift'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
