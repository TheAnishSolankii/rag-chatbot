/**
 * Utility hooks used across the app.
 */
import { useState, useEffect, useRef, useCallback } from 'react'

// ── useDebounce ───────────────────────────────────────────────────────────────
/**
 * Returns a debounced version of `value` that only updates
 * after `delay` ms have passed without a new value arriving.
 *
 * Usage:
 *   const debouncedQuery = useDebounce(query, 400)
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

// ── useLocalStorage ───────────────────────────────────────────────────────────
/**
 * Like useState but persists the value to localStorage.
 *
 * Usage:
 *   const [theme, setTheme] = useLocalStorage('theme', 'dark')
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value) => {
    try {
      const toStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(toStore)
      window.localStorage.setItem(key, JSON.stringify(toStore))
    } catch (err) {
      console.warn(`useLocalStorage: could not set "${key}"`, err)
    }
  }, [key, storedValue])

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch { /* ignore */ }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}

// ── useClickOutside ───────────────────────────────────────────────────────────
/**
 * Calls `handler` when the user clicks outside the given ref element.
 *
 * Usage:
 *   const ref = useClickOutside(() => setOpen(false))
 *   <div ref={ref}>…dropdown…</div>
 */
export function useClickOutside(handler) {
  const ref = useRef(null)

  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return
      handler(e)
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [handler])

  return ref
}

// ── useMediaQuery ─────────────────────────────────────────────────────────────
/**
 * Reactively tracks a CSS media query.
 *
 * Usage:
 *   const isMobile = useMediaQuery('(max-width: 1023px)')
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )

  useEffect(() => {
    const mql     = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

// ── useInterval ───────────────────────────────────────────────────────────────
/**
 * A declarative setInterval that respects React's lifecycle.
 *
 * Usage:
 *   useInterval(() => fetchStatus(), 5000)
 *   useInterval(() => tick(), isRunning ? 1000 : null)  // null = paused
 */
export function useInterval(callback, delay) {
  const savedCallback = useRef(callback)

  useEffect(() => { savedCallback.current = callback }, [callback])

  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}

// ── usePrevious ───────────────────────────────────────────────────────────────
/**
 * Returns the previous value of a variable (from the last render).
 *
 * Usage:
 *   const prevCount = usePrevious(count)
 */
export function usePrevious(value) {
  const ref = useRef(undefined)
  useEffect(() => { ref.current = value })
  return ref.current
}

// ── useOnMount ────────────────────────────────────────────────────────────────
/**
 * Runs callback exactly once after mount (like componentDidMount).
 *
 * Usage:
 *   useOnMount(() => fetchDocuments())
 */
export function useOnMount(fn) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fn() }, [])
}
