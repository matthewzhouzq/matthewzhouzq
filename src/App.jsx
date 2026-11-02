import DragonIntro from './intro/DragonIntro'
import Cursor from './intro/Cursor'

// The whole site is the dragon: page 1 (who I am) → page 2 (projects, one dragon lap each).
export default function App() {
  return (
    <>
      <DragonIntro />
      <Cursor />
    </>
  )
}
