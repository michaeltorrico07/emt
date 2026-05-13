import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  chatSend: (prompt: string) => ipcRenderer.invoke('chat:send', prompt),
  agentObserveScreen: () => ipcRenderer.invoke('agent:observe-screen')
})
console.log('PRELOAD LOADED')