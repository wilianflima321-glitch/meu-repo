'use client'

import { useSyncExternalStore } from 'react'

type Listener = () => void

const listeners = new Set<Listener>()
let historyPatched = false

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

function getPathnameSnapshot() {
  if (typeof window === 'undefined') {
    return '/'
  }

  return window.location.pathname
}

function getSearchSnapshot() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.location.search
}

function patchHistoryOnce() {
  if (historyPatched || typeof window === 'undefined') {
    return
  }

  historyPatched = true

  const originalPushState = window.history.pushState.bind(window.history)
  const originalReplaceState = window.history.replaceState.bind(window.history)

  window.history.pushState = function pushState(...args) {
    const result = originalPushState(...args)
    notifyListeners()
    return result
  }

  window.history.replaceState = function replaceState(...args) {
    const result = originalReplaceState(...args)
    notifyListeners()
    return result
  }

  window.addEventListener('popstate', notifyListeners)
  window.addEventListener('hashchange', notifyListeners)
}

function subscribe(listener: Listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  patchHistoryOnce()
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function useBrowserPathname() {
  return useSyncExternalStore(subscribe, getPathnameSnapshot, () => '/')
}

export function useBrowserSearch() {
  return useSyncExternalStore(subscribe, getSearchSnapshot, () => '')
}

export default useBrowserPathname
