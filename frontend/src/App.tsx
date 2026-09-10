import { RouterProvider } from 'react-router-dom'
import { router } from './routes/router'
import { UiLanguageBridge } from './data/uiLanguage'

function App() {
  return <><UiLanguageBridge /><RouterProvider router={router} /></>
}

export default App
