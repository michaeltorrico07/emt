interface Window {
  electron: {
    chatSend: (prompt: string) => Promise<{type: string, content: string}>
  }
}