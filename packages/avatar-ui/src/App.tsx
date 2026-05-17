import { listen } from '@tauri-apps/api/event'
import { createSignal, onCleanup, onMount } from 'solid-js'
import { characters, type Character } from './utils/ch'
const theme = import.meta.env.VITE_THEME as Character

const character = characters[theme] ?? characters.emilia

function App() {
  const [comments, setComments] = createSignal<string>('')

  onMount(async () => {
    const unlisten = await listen<{ event: string; data: any }>('agent-event', (e) => {
      const { event, data } = e.payload
      if (event === 'Comment') {
        setComments(data.text)
      }
      if (event === 'Error') {
        console.error('[agent]', data.message)
      }
    })

    onCleanup(() => unlisten())
  })

  return (
    <>
      <div class="flex flex-col w-auto h-screen items-center justify-end py-1 px-1">

        {/* Bubble */}
        <div class="flex justify-center w-full px-3 ">
          <div
            class="
              relative
              bg-secondary
              p-px
              rounded-[2.5rem_3rem_2.5rem_3rem]
              rotate-2
              shadow-xl
              before:content-['']
              before:absolute
              before:-bottom-1.75
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
              class={`
                relative
                bg-white
                pl-4
                ${comments() === '' ?'pr-4' : 'pr-2'}
                pt-3
                ${comments() === '' ?'pb-2.5' : 'pb-3'}
                rounded-[2.5rem_3rem_2.5rem_3rem]
                border-[3px]
                border-primary
                w-full
                before:content-['']
                before:absolute
                before:-bottom-2.5
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
                  "-webkit-text-stroke": "1px",
                }}
                class="tracking-[0.125em] text-text font-indie text-base"
              >
                {comments() === '' ? character.name : comments()}
              </p>
            </div>
          </div>
        </div>

        {/* Character image */}
        <img class="mt-2 shrink-0" src={character.image} width={200} />

        {/* Input */}
        <div class="pointer-events-auto w-fit mt-1 px-3">
          <input
            placeholder="Escribe un mensaje..."
            class="
              outline-primary
              text-sm
              font-medium
              bg-white
              px-5
              py-1.5
              rounded-[3rem_4rem_3rem_4rem]
              shadow-xl
              -rotate-1
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