import { useCallback, useState } from 'react'

const STORAGE_KEY = 'ninewood-profile-cover-bg'

function readStored(): boolean {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) !== 'false'
}

/** 个人主页是否显示封面图（关闭时用 internal-shell 纯色，随深浅模式） */
export function useProfileCoverBg() {
  const [coverBgEnabled, setEnabled] = useState(readStored)

  const setCoverBgEnabled = useCallback((value: boolean) => {
    setEnabled(value)
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  }, [])

  return { coverBgEnabled, setCoverBgEnabled }
}
