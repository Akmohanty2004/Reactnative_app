import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiLock, FiEye, FiEyeOff, FiCheck } from 'react-icons/fi'
import axios from 'axios'
import toast from '../../utils/toast'

const ResetPassword = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isReset, setIsReset] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      await axios.post('/api/auth/reset-password', {
        token,
        newPassword
      })
      setIsReset(true)
      toast.success('Password reset successful!')
      setTimeout(() => navigate('/login'), 3000)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  if (isReset) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="auth-card"
        style={{ textAlign: 'center' }}
      >
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <FiCheck style={{ fontSize: '40px', color: 'var(--success)' }} />
        </div>
        <h2 style={{ color: 'white', marginBottom: '8px' }}>Password Reset!</h2>
        <p style={{ color: 'var(--dark-400)', marginBottom: '20px' }}>
          Your password has been reset successfully. Redirecting to login...
        </p>
        <Link to="/login" className="btn-primary" style={{ display: 'inline-block' }}>
          Go to Login
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="auth-card"
    >
      <div className="logo">
        <div className="logo-icon">🔑</div>
        <h1>Reset Password</h1>
        <p>Enter your new password</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>New Password *</label>
          <div className="input-group">
            <FiLock className="icon" />
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="input-field"
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--dark-400)', marginTop: '4px' }}>
            Must be at least 6 characters with uppercase, lowercase and number
          </p>
        </div>

        <div className="form-group">
          <label>Confirm Password *</label>
          <div className="input-group">
            <FiLock className="icon" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="input-field"
              required
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </button>

        <Link to="/login" className="auth-footer" style={{ textAlign: 'center', display: 'block' }}>
          Back to Login
        </Link>
      </form>
    </motion.div>
  )
}

export default ResetPassword
