import { useState, useEffect } from 'react'
import mambo from './assets/mambo.png'

function App() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([])
  const [input, setInput] = useState('')
  const [comment, setComment] = useState('')
  useEffect(() => {
    let cancelled = false

    const loop = async () => {
      while (!cancelled) {
        try {
          const result = await window.electron.agentObserveScreen()
          setComment(result)
        } catch (error) {
          console.error(error)
        }

        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }

    loop()

    return () => {
      cancelled = true
    }
  }, [])

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
      { role: "assistant", text: result.response },
    ];

    setMessages(response);
  }

  return (
    <>
      <div className="flex flex-col w-[275px] h-[450px] items-center justify-end mt-auto">
        {/*<div className="w-full flex flex-row max-w-xl ml-1 font-medium pt-4 text-[#9778AB]">Emil <div className="font-bold text-[#9778AB]" >IA</div></div> */}
        <div className="flex justify-start">
          <div
            className="
              relative
              left-1
              bg-[#DC9C2D]
              p-[2px]
              rounded-[3rem_4rem_3rem_4rem]
              rotate-3
              shadow-xl
                before:content-['']
                before:absolute
                before:bottom-[-7px]
                before:left-16
                before:w-5
                before:h-4
                before:bg-white
                before:rotate-45
                before:border-b-2
                before:border-r-2
                before:border-[#DC9C2D]
            "
          >
            <div
              className={`
                relative
                bg-white
                pl-6
                ${comment !== '' ? 'pr-6' : 'pr-4'}
                pt-2
                ${comment !== '' ? 'pb-3' : 'pb-2'}
                rounded-[3rem_4rem_3rem_4rem]
                border
                border-black
                justify-center
                items-center
                before:content-['']
                before:absolute
                before:bottom-[-9px]
                before:left-16
                before:w-4
                before:h-4
                before:bg-white
                before:rotate-45
                before:border-b
                before:border-r
                before:border-black
              `}
            >
              <p 
                style={{
                  WebkitTextStroke: "1px",
                }}
                className="rotate-1 font-indie tracking-[0.175em] text-[#030303]"
              >
                {comment === '' ? 'MAMBO' : comment}
              </p>
            </div>
          </div>
        </div>
        <img className=" mt-4" src={mambo} style={{width: 120, height: 'auto'}}/>
        <div className="
        mb-2 justify-self-end">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Escribe un mensaje..."
            className="
                relative
                text-sm
                font-medium
                bg-white
                px-5
                py-1.5
                rounded-[3rem_4rem_3rem_4rem]
                shadow-xl
                -rotate-2
                text-gray-800
                leading-relaxed
                border-2
                border-[#181818]
            "
          />
        </div>
      </div>

    </>
  )
}

export default App