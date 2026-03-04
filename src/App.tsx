import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthPage } from './pages/AuthPage'
import { GamePage } from './pages/GamePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"     element={<AuthPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="*"     element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
