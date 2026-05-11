import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Auth/Login.jsx';
import Signup from './pages/Auth/Signup.jsx';
import UserDashboard from './pages/Dashboard/UserDashboard.jsx';
import ListenerDashboard from './pages/Dashboard/ListenerDashboard.jsx';
import Browse from './pages/Browse.jsx';
import ListenerProfile from './pages/ListenerProfile.jsx';
import BookSlot from './pages/BookSlot.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import BookingConfirmation from './pages/BookingConfirmation.jsx';

function App() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-800">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/listeners/:id" element={<ListenerProfile />} />
          <Route path="/book/:id" element={<BookSlot />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/booking-confirmation/:id" element={<BookingConfirmation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/listener"
            element={
              <ProtectedRoute>
                <ListenerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
