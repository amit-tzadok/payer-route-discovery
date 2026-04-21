// instrumentation.ts — runs once per server start, in the rendering context,
// before any page is compiled or served.
//
// Purpose: patch the broken Node.js 25 localStorage global so Next.js 15's
// dev overlay doesn't crash with "localStorage.getItem is not a function".

export async function register() {
  if (typeof globalThis.localStorage === 'undefined') return
  try {
    ;(globalThis.localStorage as Storage).getItem('__probe__')
  } catch {
    const store: Record<string, string> = {}
    const polyfill: Storage = {
      getItem:    (k: string)            => store[k] ?? null,
      setItem:    (k: string, v: string) => { store[k] = String(v) },
      removeItem: (k: string)            => { delete store[k] },
      clear:      ()                     => { for (const k in store) delete store[k] },
      get length()                       { return Object.keys(store).length },
      key:        (n: number)            => Object.keys(store)[n] ?? null,
    }
    Object.defineProperty(globalThis, 'localStorage', {
      value: polyfill, configurable: true, writable: true,
    })
  }
}
