import type { NextConfig } from 'next'

// ── Node.js 25 localStorage polyfill ─────────────────────────────────────────
// Node.js 25 exposes `localStorage` as a global empty object {} (not undefined)
// when launched without a valid --localstorage-file path.  Next.js 15's dev
// overlay does `if (typeof localStorage !== 'undefined') localStorage.getItem(…)`
// — the guard passes, the call throws TypeError.  Replace it with a real
// in-memory Storage implementation so all downstream code works correctly.
patchNodeLocalStorage()

function patchNodeLocalStorage() {
  if (typeof globalThis.localStorage === 'undefined') return
  try {
    // If getItem works fine, no patch needed
    ;(globalThis.localStorage as Storage).getItem('__probe__')
  } catch {
    const store: Record<string, string> = {}
    const polyfill: Storage = {
      getItem:    (k: string)         => store[k] ?? null,
      setItem:    (k: string, v: string) => { store[k] = String(v) },
      removeItem: (k: string)         => { delete store[k] },
      clear:      ()                  => { for (const k in store) delete store[k] },
      get length()                    { return Object.keys(store).length },
      key:        (n: number)         => Object.keys(store)[n] ?? null,
    }
    Object.defineProperty(globalThis, 'localStorage', {
      value: polyfill, configurable: true, writable: true,
    })
  }
}

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      root: __dirname,
    },
  },
}

export default nextConfig
