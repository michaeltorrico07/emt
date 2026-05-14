import { useState, useEffect } from 'react'
import { characters } from './utils/ch'

const currentTheme = window.env.theme || 'emilia'

const character = characters[currentTheme as keyof typeof characters] ?? characters.emilia

function App() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([])
  const [input, setInput] = useState('')
  const [comment, setComment] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = currentTheme
  }, [])

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      try {
        const result = await window.electron.agentObserveScreen()
        if (!cancelled) setComment(result)
      } catch (error) {
        if (!cancelled) console.error(error)
      }
      if (!cancelled) setTimeout(tick, 7000)
    }

    tick()
    return () => { cancelled = true }
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
              bg-secondary
              p-px
              rounded-[3rem_4rem_3rem_4rem]
              rotate-3
              shadow-xl
                before:content-['']
                before:absolute
                before:bottom-[-7px]
                before:left-1/2
                before:-translate-x-1/2
                before:w-4
                before:h-4
                before:bg-white
                before:rotate-45
                before:border-b
                before:border-r
                before:border-secondary
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
                border-[3px]
                border-primary
                justify-center
                items-center
                before:content-['']
                before:absolute
                before:bottom-[-10px]
                before:left-1/2
                before:-translate-x-1/2
                before:w-4
                before:h-4
                before:bg-surface
                before:rotate-45
                before:border-b-[3px]
                before:border-r-[3px]
                before:border-primary
              `}
            >
              <p 
                style={{
                  WebkitTextStroke: "1px",
                }}
                className="rotate-1 font-indie tracking-[0.175em] text-text"
              >
                {comment === '' ? `${character.name}` : comment}
              </p>
            </div>
          </div>
        </div>
        <img className=" mt-4" src={character.image} style={{width: 120, height: 'auto'}}/>
        <div className="
        mb-2 justify-self-end">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Escribe un mensaje..."
            className="
                outline-primary
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
                border-primary
            "
          />
        </div>
      </div>

    </>
  )
}

export default App