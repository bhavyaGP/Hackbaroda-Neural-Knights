import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import CustomerChat from './pages/CustomerChat'
import OwnerDashboard from './pages/OwnerDashboard'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<OwnerDashboard />} />
        <Route path="/chat" element={<CustomerChat />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
