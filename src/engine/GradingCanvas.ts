import { Application, Filter, Sprite, Texture } from 'pixi.js'
import { createGradingFilter, updateGradingFilter } from './filters/gradingFilter'
import type { GradingUniformValues } from './pipeline'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}

/**
 * Owns a PixiJS application that renders one photo with the grading filter.
 * PixiJS is used purely as the WebGL runtime (texture, render loop, resize);
 * all color math lives in the single custom filter.
 */
export class GradingCanvas {
  private container: HTMLElement
  private app: Application | null = null
  private sprite: Sprite | null = null
  private readonly filter: Filter
  private resizeObserver: ResizeObserver | null = null
  private destroyed = false

  constructor(container: HTMLElement) {
    this.container = container
    this.filter = createGradingFilter()
  }

  async init(): Promise<void> {
    const app = new Application()
    await app.init({
      width: this.container.clientWidth || 800,
      height: this.container.clientHeight || 600,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      preference: 'webgl',
    })

    // init() is async; the component may have unmounted while we awaited.
    if (this.destroyed) {
      app.destroy(true)
      return
    }

    this.container.appendChild(app.canvas)
    this.app = app

    this.resizeObserver = new ResizeObserver(() => this.handleResize())
    this.resizeObserver.observe(this.container)
  }

  /** Load and display an image (URL or object URL). Replaces any current image. */
  async setImage(src: string): Promise<void> {
    if (!this.app) return
    const img = await loadImage(src)
    if (this.destroyed || !this.app) return

    const texture = Texture.from(img)

    if (this.sprite) {
      this.app.stage.removeChild(this.sprite)
      this.sprite.destroy()
      this.sprite = null
    }

    const sprite = new Sprite(texture)
    sprite.anchor.set(0.5)
    sprite.filters = [this.filter]
    this.app.stage.addChild(sprite)
    this.sprite = sprite
    this.fit()
  }

  /** Cheap per-frame update of the grading uniforms. */
  setUniforms(values: GradingUniformValues): void {
    updateGradingFilter(this.filter, values)
  }

  /**
   * Toggle the grading filter on the sprite.
   * `false` shows the raw original (true before); does not change shader math.
   */
  setFilterEnabled(enabled: boolean): void {
    if (!this.sprite) return
    this.sprite.filters = enabled ? [this.filter] : null
  }

  /**
   * Sample the graded sprite into an ImageData (downscaled for histogram use).
   * Does not change shader math. Returns null if not ready.
   */
  sampleImageData(maxSide = 256): ImageData | null {
    if (!this.app || !this.sprite || this.destroyed) return null

    const tw = this.sprite.texture.width
    const th = this.sprite.texture.height
    if (tw <= 0 || th <= 0) return null

    const resolution = Math.min(1, maxSide / Math.max(tw, th))

    try {
      // Ensure the filtered sprite has been drawn into a framebuffer.
      this.app.renderer.render(this.app.stage)

      // Prefer canvas extract — more reliable across WebGL backends than raw pixels.
      const extracted = this.app.renderer.extract.canvas({
        target: this.sprite,
        resolution,
      }) as HTMLCanvasElement | OffscreenCanvas

      const srcW = extracted.width
      const srcH = extracted.height
      if (!srcW || !srcH) return null

      const scale = Math.min(1, maxSide / Math.max(srcW, srcH))
      const dw = Math.max(1, Math.round(srcW * scale))
      const dh = Math.max(1, Math.round(srcH * scale))

      const off = document.createElement('canvas')
      off.width = dw
      off.height = dh
      const ctx = off.getContext('2d', { willReadFrequently: true })
      if (!ctx) return null

      ctx.drawImage(extracted as CanvasImageSource, 0, 0, dw, dh)
      return ctx.getImageData(0, 0, dw, dh)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[GradingCanvas] sampleImageData failed', err)
      }
      return null
    }
  }

  private fit(): void {
    if (!this.app || !this.sprite) return
    const { width: sw, height: sh } = this.app.screen
    const tw = this.sprite.texture.width
    const th = this.sprite.texture.height
    if (sw === 0 || sh === 0 || tw === 0 || th === 0) return
    const scale = Math.min(sw / tw, sh / th)
    this.sprite.scale.set(scale)
    this.sprite.position.set(sw / 2, sh / 2)
  }

  private handleResize(): void {
    if (!this.app) return
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (w === 0 || h === 0) return
    this.app.renderer.resize(w, h)
    this.fit()
  }

  destroy(): void {
    this.destroyed = true
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true })
      this.app = null
    }
    this.sprite = null
  }
}
