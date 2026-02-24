import { Routes, Route } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import Home from './pages/Home'
import Archive from './pages/Archive'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
      <Route path="/archive" element={<AuthGuard><Archive /></AuthGuard>} />
    </Routes>
  )
}
