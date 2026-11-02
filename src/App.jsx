import DragonIntro from './intro/DragonIntro'
import Cursor from './ui/Cursor'

// The whole site is the dragon: scene 1 (who I am) → camera pans → scene 2 (what I'm building).
// The old 3D desk lives on in src/scene + src/ui but isn't mounted any more.
export default function App() {
  return (
    <>
      <DragonIntro />
      <Cursor />
    </>
  )
}
