import type { RocketDesktopApi } from '../../../src/desktop/preload'

declare global {
  interface Window {
    rocket: RocketDesktopApi
  }
}

export {}
