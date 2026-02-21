import { vi } from 'vitest'

const { getDocumentMock } = vi.hoisted(() => ({
  getDocumentMock: vi.fn(),
}))

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: getDocumentMock,
}))

vi.mock('@/features/pdf/pdfWorker', () => ({}))

import { readPdfMetadata } from '@/features/pdf/usePdfDocument'

describe('readPdfMetadata', () => {
  beforeEach(() => {
    getDocumentMock.mockReset()
  })

  it('collects page count and dimensions from pdf.js document', async () => {
    const destroyDocument = vi.fn().mockResolvedValue(undefined)
    const destroyLoadingTask = vi.fn().mockResolvedValue(undefined)
    const getPage = vi
      .fn()
      .mockResolvedValueOnce({
        getViewport: () => ({ width: 400, height: 500 }),
      })
      .mockResolvedValueOnce({
        getViewport: () => ({ width: 612, height: 792 }),
      })

    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({
        numPages: 2,
        getPage,
        destroy: destroyDocument,
      }),
      destroy: destroyLoadingTask,
    })

    const inputBytes = new Uint8Array([1, 2, 3, 4])
    const metadata = await readPdfMetadata(inputBytes)

    expect(metadata.pageCount).toBe(2)
    expect(metadata.pageSizes).toEqual([
      { width: 400, height: 500 },
      { width: 612, height: 792 },
    ])

    expect(getPage).toHaveBeenNthCalledWith(1, 1)
    expect(getPage).toHaveBeenNthCalledWith(2, 2)
    expect(destroyDocument).toHaveBeenCalledTimes(1)
    expect(destroyLoadingTask).toHaveBeenCalledTimes(1)
  })

  it('passes cloned bytes into getDocument (keeps source bytes stable)', async () => {
    const destroyDocument = vi.fn().mockResolvedValue(undefined)
    const destroyLoadingTask = vi.fn().mockResolvedValue(undefined)
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getViewport: () => ({ width: 300, height: 400 }),
        }),
        destroy: destroyDocument,
      }),
      destroy: destroyLoadingTask,
    })

    const inputBytes = new Uint8Array([9, 8, 7, 6])
    await readPdfMetadata(inputBytes)

    expect(getDocumentMock).toHaveBeenCalledTimes(1)
    const callArg = getDocumentMock.mock.calls[0]?.[0] as { data: Uint8Array }
    expect(callArg.data).toBeInstanceOf(Uint8Array)
    expect(callArg.data).not.toBe(inputBytes)
    expect(Array.from(callArg.data)).toEqual(Array.from(inputBytes))
  })
})
