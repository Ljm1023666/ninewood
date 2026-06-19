import { useEffect } from 'react'

type Shortcut = { key: string; ctrl?: boolean; handler: () => void }

export function useKeyboard(shortcuts: Shortcut[]) {
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      for (const s of shortcuts) {
        const keyMatch = e.key === s.key
        const ctrlMatch = s.ctrl ? e.ctrlKey || e.metaKey : true
        if (keyMatch && ctrlMatch) {
          e.preventDefault()
          s.handler()
          return
        }
      }
    }
    document.addEventListener('keydown', onKeydown)
    return () => document.removeEventListener('keydown', onKeydown)
  }, [shortcuts])
}
