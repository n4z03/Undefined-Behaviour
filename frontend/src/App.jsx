// code written by Rupneet (ID: 261096653)

import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import OwnerDashboardPage from './pages/OwnerDashboardPage'
import UserDashboardPage from './pages/UserDashboardPage'
import './styles/App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/owner-dashboard" element={<OwnerDashboardPage />} />
      <Route path="/user-dashboard" element={<UserDashboardPage />} />
    </Routes>
  )
}

export default App
