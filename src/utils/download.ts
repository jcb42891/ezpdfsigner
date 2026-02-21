export const triggerFileDownload = (
  fileBytes: Uint8Array,
  fileName: string,
  mimeType = 'application/pdf',
): void => {
  const safeBytes = new Uint8Array(fileBytes.byteLength)
  safeBytes.set(fileBytes)
  const blob = new Blob([safeBytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
