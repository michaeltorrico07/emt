import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  openApp: (app: string) =>
    ipcRenderer.invoke('open-app', app)
})
console.log('PRELOAD LOADED')