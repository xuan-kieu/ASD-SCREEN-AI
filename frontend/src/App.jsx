import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AddChild from './pages/AddChild'
import ChildDetail from './pages/ChildDetail'
import Assessment from './pages/Assessment'
import Report from './pages/Report'
import Messages from './pages/Messages'
import Admin from './pages/Admin'
import Profile from './pages/Profile'

function PrivateRoute({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard"      element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/children/add"   element={<PrivateRoute><AddChild /></PrivateRoute>} />
        <Route path="/children/:id"   element={<PrivateRoute><ChildDetail /></PrivateRoute>} />
        <Route path="/assessment/:id" element={<PrivateRoute><Assessment /></PrivateRoute>} />
        <Route path="/report/:id"     element={<PrivateRoute><Report /></PrivateRoute>} />
        <Route path="/messages"       element={<PrivateRoute><Messages /></PrivateRoute>} />
        <Route path="/admin"          element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="/profile"        element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}