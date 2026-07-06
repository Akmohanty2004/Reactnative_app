import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Layouts
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Student Pages
import StudentDashboard from './pages/student/Dashboard'
import StudentExams from './pages/student/Exams'
import StudentExam from './pages/student/Exam'
import StudentResults from './pages/student/Results'
import StudentProfile from './pages/student/Profile'

// Teacher Pages
import TeacherDashboard from './pages/teacher/Dashboard'
import TeacherExams from './pages/teacher/Exams'
import CreateExam from './pages/teacher/CreateExam'
import EditExam from './pages/teacher/EditExam'
import ExamDetails from './pages/teacher/ExamDetails'
import TeacherResults from './pages/teacher/Results'
import TeacherProfile from './pages/teacher/Profile'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminExams from './pages/admin/Exams'
import AdminResults from './pages/admin/Results'
import AdminProfile from './pages/admin/Profile'

// Components
import ProtectedRoute from './components/common/ProtectedRoute'
function App() {

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <Routes>
        {/* Public Routes - No authentication needed */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Route>

        {/* Protected Student Routes */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route element={<MainLayout />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/exams" element={<StudentExams />} />
            <Route path="/student/results" element={<StudentResults />} />
            <Route path="/student/profile" element={<StudentProfile />} />
          </Route>
          <Route path="/student/exam/:examId" element={<StudentExam />} />
        </Route>

        {/* Protected Teacher Routes */}
        <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
          <Route element={<MainLayout />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/exams" element={<TeacherExams />} />
            <Route path="/teacher/create-exam" element={<CreateExam />} />
            <Route path="/teacher/edit-exam/:examId" element={<EditExam />} />
            <Route path="/teacher/exam/:examId" element={<ExamDetails />} />
            <Route path="/teacher/results" element={<TeacherResults />} />
            <Route path="/teacher/profile" element={<TeacherProfile />} />
          </Route>
        </Route>

        {/* Protected Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<MainLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/exams" element={<AdminExams />} />
            <Route path="/admin/results" element={<AdminResults />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
          </Route>
        </Route>

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App