interface Window {
  electron: {
    openApp: (app: string) => Promise<void>
  }
}