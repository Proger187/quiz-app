import { Routes, Route } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { TooltipProvider } from './components/ui/tooltip'
import Home from './pages/Home'
import TestEditor from './pages/TestEditor'
import PracticeSetup from './pages/PracticeSetup'
import PracticeSession from './pages/PracticeSession'
import Results from './pages/Results'

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <NavBar />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/editor" element={<TestEditor />} />
            <Route path="/editor/:testId" element={<TestEditor />} />
            <Route path="/setup/:testId" element={<PracticeSetup />} />
            <Route path="/session/:sessionId" element={<PracticeSession />} />
            <Route path="/results/:sessionId" element={<Results />} />
          </Routes>
        </div>
      </div>
    </TooltipProvider>
  )
}
