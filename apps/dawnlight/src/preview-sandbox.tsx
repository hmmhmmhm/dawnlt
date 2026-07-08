import ReactDOM from 'react-dom/client'
import './index.css'
import { Dawnlight } from './components/dawnlight'
import { preventDefaultTouchBehaviors } from './utils/prevent-touch-defaults'

// Prevent mobile browser default touch behaviors globally
preventDefaultTouchBehaviors()

export default function App() {
  return <Dawnlight />
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
