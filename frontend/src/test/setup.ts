import { vi } from 'vitest'

// jsdom has no scrolling viewport. assistant-ui only needs the browser method.
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.scrollTo = vi.fn()

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: ResizeObserverStub })

if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false, media: '', onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })
}
