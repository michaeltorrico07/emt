interface Window {
  electron: {
    chatSend: (prompt: string) => Promise<{type: string, response: string}>
    agentObserveScreen: () => Promise<string>
  }
  env: {
    theme: string
  }
}