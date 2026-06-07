import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import CustomerChat from "./pages/CustomerChat";
import OwnerDashboard from "./pages/OwnerDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/chat" element={<CustomerChat />} />
        <Route path="/dashboard" element={<OwnerDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
