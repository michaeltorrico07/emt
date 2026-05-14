import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  chatSend: (prompt: string) => ipcRenderer.invoke('chat:send', prompt),
  agentObserveScreen: () => ipcRenderer.invoke('agent:observe-screen')
})
contextBridge.exposeInMainWorld('env', {
  theme: process.env.THEME ?? 'emilia',
})
console.log('PRELOAD LOADED')