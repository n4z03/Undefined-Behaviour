// code written by Rupneet (ID: 261096653)
// code added by Nazifa Ahmed (261112966)

import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import './styles/App.css'

function App() {
  const [currentUser, setCurrentUser] = useState(null)

  async function handleLogout() {
    try {
      await fetch('http://localhost:3000/api/auth/logout', { method: 'POST' })
    } catch (error) {
      // Scaffold stage: clear local user even if logout request fails.
    }
    setCurrentUser(null)
  }

  if (currentUser) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Logged in as: {currentUser.email}</p>
        <p>Role: {currentUser.role}</p>
        <button type="button" onClick={handleLogout}>Log out</button>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
    </Routes>
  )
}

export default App
