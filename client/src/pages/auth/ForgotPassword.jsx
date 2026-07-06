import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiMail, FiArrowLeft } from 'react-icons/fi'
import axios from 'axios'
import toast from '../../utils/toast'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email')
      return
    }

    setIsLoading(true)
    try {
      await axios.post('/api/auth/forgot-password', { email })
      setIsSent(true)
      toast.success('Password reset link sent to your email')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset link')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="auth-card"
    >
      <div className="logo">
        <div className="logo-icon">🔐</div>
        <h1>Forgot Password</h1>
        <p>Enter your email to receive a password reset link</p>
      </div>

      {isSent ? (
        <div>
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--success)',
            padding: '16px',
            borderRadius: 'var(--border-radius)',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p>Password reset link has been sent to your email.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Please check your inbox and spam folder.</p>
          </div>
          <Link to="/login" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            <FiArrowLeft /> Back to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-group">
              <FiMail className="icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="input-field"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <Link to="/login" className="auth-footer" style={{ textAlign: 'center', display: 'block' }}>
            <FiArrowLeft style={{ display: 'inline', marginRight: '6px' }} />
            Back to Login
          </Link>
        </form>
      )}
    </motion.div>
  )
}

export default ForgotPassword
