const fs = require('fs');
const path = require('path');

function patchClipboardImage() {
  const file = path.join(
    process.cwd(),
    'node_modules',
    'expo-clipboard',
    'android',
    'src',
    'main',
    'java',
    'expo',
    'modules',
    'clipboard',
    'ClipboardImage.kt'
  );

  if (!fs.existsSync(file)) return;

  let content = fs.readFileSync(file, 'utf8');

  // Replace decodeByteArray without options with downsampled decode
  const target = `  val byteArray = Base64.decode(base64Image, Base64.DEFAULT)
  BitmapFactory.decodeByteArray(byteArray, 0, byteArray.size)
    ?: throw RuntimeException("Failed to convert base64 into Bitmap")`;

  const replacement = `  val byteArray = Base64.decode(base64Image, Base64.DEFAULT)
  val options = BitmapFactory.Options().apply {
    inJustDecodeBounds = true
  }
  BitmapFactory.decodeByteArray(byteArray, 0, byteArray.size, options)
  val maxDimension = 2048
  var sampleSize = 1
  while (options.outWidth / sampleSize > maxDimension || options.outHeight / sampleSize > maxDimension) {
    sampleSize *= 2
  }
  options.inJustDecodeBounds = false
  options.inSampleSize = sampleSize
  BitmapFactory.decodeByteArray(byteArray, 0, byteArray.size, options)
    ?: throw RuntimeException("Failed to convert base64 into Bitmap")`;

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log('[patch] Patched expo-clipboard ClipboardImage.kt with BitmapFactory.Options downsampling.');
  }
}

function patchExpoUiImageLoader() {
  const possiblePaths = [
    path.join(process.cwd(), 'node_modules', '@expo', 'ui', 'android', 'src', 'main', 'java', 'expo', 'modules', 'ui', 'graphics', 'ImageLoader.kt'),
    path.join(process.cwd(), 'node_modules', 'expo-router', 'node_modules', '@expo', 'ui', 'android', 'src', 'main', 'java', 'expo', 'modules', 'ui', 'graphics', 'ImageLoader.kt'),
  ];

  for (const file of possiblePaths) {
    if (!fs.existsSync(file)) continue;

    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    const targetRes = `val bitmap = BitmapFactory.decodeResource(context.resources, resourceId)`;
    const replacementRes = `val decodeOptions = BitmapFactory.Options().apply { inSampleSize = 1 }\n      val bitmap = BitmapFactory.decodeResource(context.resources, resourceId, decodeOptions)`;

    if (content.includes(targetRes)) {
      content = content.replace(targetRes, replacementRes);
      changed = true;
    }

    const targetBytes = `val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)`;
    const replacementBytes = `val decodeOptions = BitmapFactory.Options().apply { inSampleSize = 1 }\n      val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decodeOptions)`;

    if (content.includes(targetBytes)) {
      content = content.replace(targetBytes, replacementBytes);
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`[patch] Patched @expo/ui ImageLoader.kt with BitmapFactory.Options at ${file}`);
    }
  }
}

function run() {
  patchClipboardImage();
  patchExpoUiImageLoader();
}

if (require.main === module) {
  run();
}

module.exports = { run };
