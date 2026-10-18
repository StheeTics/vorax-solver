// jsdom has no ImageData; the Solver's picture code uses it as browsers provide it.
if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataShim {
    data: Uint8ClampedArray
    width: number
    height: number
    constructor(a: Uint8ClampedArray | number, b: number, c?: number) {
      if (typeof a === 'number') {
        this.width = a
        this.height = b
        this.data = new Uint8ClampedArray(a * b * 4)
      } else {
        this.data = a
        this.width = b
        this.height = c ?? a.length / 4 / b
      }
    }
  }
  globalThis.ImageData = ImageDataShim as unknown as typeof ImageData
}
