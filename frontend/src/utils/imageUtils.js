export function compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.85) {
  return new Promise((resolve, reject) => {
    // 画像でない場合はそのまま返す
    if (!file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img

        // リサイズが必要かチェック
        if (width <= maxWidth && height <= maxHeight && file.size < 1024 * 1024) {
          // 1MB未満でサイズも小さい場合は圧縮不要
          resolve(file)
          return
        }

        // アスペクト比を維持してリサイズ
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              // 圧縮後のファイル名（拡張子を.jpgに統一）
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              console.log(`圧縮前: ${(file.size / 1024 / 1024).toFixed(2)}MB -> 圧縮後: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
              resolve(compressedFile)
            } else {
              reject(new Error('画像の圧縮に失敗しました'))
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'))
    reader.readAsDataURL(file)
  })
}
