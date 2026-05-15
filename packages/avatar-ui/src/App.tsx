import { characters, type Character } from './utils/ch'
const theme = import.meta.env.VITE_THEME as Character

const character = characters[theme] ?? characters.emilia

function App() {
  return (
    <>
      <div class="flex flex-col w-68.75 h-112 items-center justify-end mt-auto">
        {/*<div className="w-full flex flex-row max-w-xl ml-1 font-medium pt-4 text-[#9778AB]">Emil <div className="font-bold text-[#9778AB]" >IA</div></div> */}
        <div class="flex justify-start">
          <div
            class="
              mt-1
              relative
              left-1
              bg-secondary
              p-px
              rounded-[3rem_4rem_3rem_4rem]
              rotate-3
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
                pl-5
                pr-5
                pt-2
                pb-2
                rounded-[3rem_4rem_3rem_4rem]
                border-[3px]
                border-primary
                justify-center
                items-center
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
                class="-rotate-1 font-indie tracking-[0.175em] text-text"
              >
                {character.name}
              </p>
            </div>
          </div>
        </div>
        <img class=" mt-4" src={character.image} width={200}/>
        <div class="
        pointer-events-auto
        mb-0.5 justify-self-end">
          <input
            placeholder="Escribe un mensaje..."
            class="
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
