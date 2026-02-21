import { useEffect, useState } from 'react'

export const useDataUrlImage = (dataUrl: string | null): HTMLImageElement | null => {
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!dataUrl) {
      setImageElement(null)
      return
    }

    const image = new Image()
    image.onload = () => {
      setImageElement(image)
    }
    image.src = dataUrl

    return () => {
      image.onload = null
    }
  }, [dataUrl])

  return imageElement
}
