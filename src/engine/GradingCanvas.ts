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
