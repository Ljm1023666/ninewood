export {}

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean
      platform: string
      quitApp: () => Promise<boolean>
      minimizeWindow: () => Promise<boolean>
      maximizeWindow: () => Promise<boolean>
    }
  }
}
