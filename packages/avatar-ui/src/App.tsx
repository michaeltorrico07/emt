import { useCallback } from 'react'

function App() {


  const callingTool = useCallback(async ()=>{
    await window.electron.openApp(
      'steam://rungameid/1229490'
    )
  },[])
  console.log(window.electron)
  return (
    <div className="flex h-screen items-center justify-center">
      <button
        type="button"
        className="text-center cursor-pointer px-4 py-1"
        onClick={callingTool}
      >
        LOL
      </button>
      <div className='flex-col border-2 rounded-lg px-4 border-[#ff297b]'>
        <div className='border px-2 py-1 rounded-lg text-sm leading-[14px]'>abri ultra god</div>
        <div className='border px-2 py-1 rounded-lg text-sm leading-[14px]'>abri ultra god</div>
        
        <input className="outline-none" />
      </div>
    </div>
  )
}

export default App