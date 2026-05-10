import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  chatSend: (prompt: string) =>
    ipcRenderer.invoke('chat:send', prompt)
})
console.log('PRELOAD LOADED')