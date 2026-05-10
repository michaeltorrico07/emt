import { useState } from 'react'

function App() {
  const [messages, setMessages] = useState<{role: string, text:string}[]>([]);
  const [input, setInput] = useState("");

  async function sendMessage() {
    if (!input.trim()) return;

    const newMessages = [
      ...messages,
      { role: "user", text: input },
    ];
    setMessages(newMessages);
    setInput("");

    const result = await window.electron.chatSend(input)
    console.log(result)
    const response = [
      ...newMessages,
      { role: "assistant", text: result.content },
    ];

    setMessages(response);
  }

  return (
    <>
      <div className="flex h-screen w-screen flex-col items-center justify-start py-4">
        <div className="w-[40%]">EmilIA</div>

        <div className="flex flex-col bg-black/30 w-[40%] max-h-[80%] h-full rounded-lg">

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-2xl shadow text-sm ${
                    m.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-800"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Escribe un mensaje..."
              className="flex-1 shadow rounded-lg px-3 py-0 text-sm outline-none bg-white"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-500 text-white px-4 py-1 text-sm rounded-xl cursor-pointer"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>

    </>
  )
}

export default App