import { Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import BuyerAuthGuard from './components/BuyerAuthGuard'
import RootRedirect from './components/RootRedirect'
import Login from './pages/Login'
import VendorPage from './pages/VendorPage'
import VendorDashboard from './pages/VendorDashboard'
import Messages from './pages/Messages'
import BuyerHome from './pages/BuyerHome'
import BuyerProfile from './pages/BuyerProfile'
import VendorSignup from './pages/VendorSignup'
import VendorSettings from './pages/VendorSettings'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<VendorSignup />} />
      <Route path="/v/:handle" element={<VendorPage />} />
      <Route path="/home" element={<BuyerAuthGuard><BuyerHome /></BuyerAuthGuard>} />
      <Route path="/profile" element={<BuyerAuthGuard><BuyerProfile /></BuyerAuthGuard>} />
      <Route path="/messages" element={<BuyerAuthGuard><Messages /></BuyerAuthGuard>} />
      <Route path="/vendor" element={<AuthGuard><VendorDashboard /></AuthGuard>} />
      <Route path="/vendor-settings" element={<AuthGuard><VendorSettings /></AuthGuard>} />
      <Route path="/rack" element={<Navigate to="/vendor" replace />} />
      <Route path="/manage" element={<Navigate to="/vendor" replace />} />
      <Route path="/archive" element={<Navigate to="/vendor" replace />} />
    </Routes>
  )
}
