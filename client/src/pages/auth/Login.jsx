import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiUserCheck, FiShield, FiKey, FiX } from 'react-icons/fi'
import { loginUser, verifyLoginUser, clearError } from '../../redux/slices/authSlice'
import loginBg from '../../assets/loginbackground.png'

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showOTP, setShowOTP] = useState(false)
  const [errors, setErrors] = useState({})  
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading, error, isAuthenticated, user } = useSelector(state => state.auth)

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/${user.role}/dashboard`, { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const roles = [
    { id: 'student', label: 'Student', icon: FiUser, color: '#6366f1' },
    { id: 'teacher', label: 'Teacher', icon: FiUserCheck, color: '#8b5cf6' },
    { id: 'admin', label: 'Admin', icon: FiShield, color: '#ef4444' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    let newErrors = {};
    if (!email) newErrors.email = 'Please fill this Email field';
    if (!password) newErrors.password = 'Please fill this Password field';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    const resultAction = await dispatch(loginUser({ email, password, role: selectedRole }))
    if (loginUser.fulfilled.match(resultAction)) {
      setShowOTP(true)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (!otp) {
      setErrors({ otp: 'Please enter the OTP' })
      return
    }
    setErrors({})
    await dispatch(verifyLoginUser({ email, password, role: selectedRole, otp }))
  }

  // Text animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 12, stiffness: 100 } }
  }

  return (
    <div className="auth-page-bg" style={{
      backgroundImage: `url(${loginBg})`,
      display: 'flex',
      justifyContent: 'center',
      gap: 'min(10vw, 150px)',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
      padding: '0 20px'
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        zIndex: 0
      }} />

      {/* Left Side Content */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '550px',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)'
        }}
        className="hide-on-mobile"
      >
        <style>{`
          @media (max-width: 900px) {
            .hide-on-mobile { display: none; }
          }
          .typewriter {
            overflow: hidden;
            border-right: .15em solid #38bdf8;
            white-space: nowrap;
            margin: 0 auto;
            letter-spacing: .05em;
            animation: typing 3.5s steps(40, end), blink-caret .75s step-end infinite;
          }
          @keyframes typing { from { width: 0 } to { width: 100% } }
          @keyframes blink-caret { from, to { border-color: transparent } 50% { border-color: #38bdf8; } }
        `}</style>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 style={{ fontSize: '56px', fontWeight: '800', lineHeight: '1.2', margin: '0 0 16px 0', color: '#ffffff' }}>
            Master Your <br/>
            <span style={{ color: '#38bdf8', textShadow: '0 0 15px rgba(56,189,248,0.5)' }}>Next Exam.</span>
          </h1>
        </motion.div>
        
        <div style={{ display: 'inline-block' }}>
          <p className="typewriter" style={{ fontSize: '22px', color: '#bae6fd', margin: '0 0 24px 0', fontWeight: '500' }}>
            The online examination platform.
          </p>
        </div>

        <motion.p 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
          style={{ fontSize: '17px', color: '#e0f2fe', lineHeight: '1.7', opacity: 0.85 }}
        >
          Experience seamless assessments, highly secure testing environments, and instant result analytics. Your journey to academic excellence starts right here.
        </motion.p>
      </motion.div>

      {/* Real Login Form Overlay */}
      <motion.div
        initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        style={{
          position: 'relative', width: '100%', maxWidth: '440px',
          background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)', borderTop: '1px solid rgba(255, 255, 255, 0.2)', borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px', padding: '40px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
          zIndex: 20
        }}
      >
        <AnimatePresence mode="wait">
          {!showOTP ? (
            <motion.div key="loginForm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>
              {/* Logo and Animated Text */}
              <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ textAlign: 'center', marginBottom: '32px' }}>
                <motion.div variants={itemVariants} animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: '32px', color: 'white', marginBottom: '16px', boxShadow: '0 10px 25px rgba(99,102,241,0.4)' }}>📚</motion.div>
                <motion.h1 variants={itemVariants} style={{ fontSize: '32px', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Welcome Back</motion.h1>
                <motion.p variants={itemVariants} style={{ color: '#94a3b8', fontSize: '15px', marginTop: '8px' }}>Enter your details to access ExamHub</motion.p>
              </motion.div>

              {/* Role Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '28px' }}>
                {roles.map((role) => {
                  const Icon = role.icon
                  const isActive = selectedRole === role.id
                  return (
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} key={role.id} type="button" onClick={() => setSelectedRole(role.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '14px 10px', borderRadius: '16px',
                        background: isActive ? `rgba(${role.color === '#6366f1' ? '99,102,241' : role.color === '#8b5cf6' ? '139,92,246' : '239,68,68'}, 0.2)` : 'rgba(255,255,255,0.03)',
                        color: isActive ? 'white' : '#94a3b8', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '13px', fontWeight: 600,
                        boxShadow: isActive ? `0 4px 15px rgba(${role.color === '#6366f1' ? '99,102,241' : role.color === '#8b5cf6' ? '139,92,246' : '239,68,68'}, 0.2)` : 'none'
                      }}
                    >
                      <Icon style={{ fontSize: '24px', color: isActive ? role.color : '#64748b' }} />
                      {role.label}
                    </motion.button>
                  )
                })}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <FiMail style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px' }} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" style={{ width: '100%', padding: '14px 18px 14px 48px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', color: 'white', fontSize: '15px', outline: 'none', transition: 'all 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#38bdf8'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} />
                  </div>
                  {errors.email && <span style={{ color: '#f87171', fontSize: '13px', marginTop: '4px' }}>{errors.email}</span>}
                </div>

                {/* Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <FiLock style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px' }} />
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" style={{ width: '100%', padding: '14px 48px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', color: 'white', fontSize: '15px', outline: 'none', transition: 'all 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#38bdf8'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>{showPassword ? <FiEyeOff /> : <FiEye />}</button>
                  </div>
                  {errors.password && <span style={{ color: '#f87171', fontSize: '13px', marginTop: '4px' }}>{errors.password}</span>}
                </div>

                {/* Options */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#94a3b8', cursor: 'pointer' }}><input type="checkbox" style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }} /> Remember me</label>
                  <Link to="/forgot-password" style={{ color: '#818cf8', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>Forgot Password?</Link>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '14px 16px', borderRadius: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span> {error}
                  </motion.div>
                )}

                <motion.button
                  whileHover={!isLoading ? { scale: 1.02, boxShadow: '0 8px 25px rgba(99,102,241,0.4)' } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
                  type="submit" disabled={isLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontWeight: 700, fontSize: '16px', border: 'none', borderRadius: '16px', marginTop: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
                >
                  {isLoading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> : 'Send OTP'}
                </motion.button>

                {selectedRole !== 'admin' && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
                    Don't have an account? <Link to="/register" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>Register here</Link>
                  </div>
                )}
              </form>
            </motion.div>
          ) : (
            <motion.div key="otpForm" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3 }}>
              {/* Close Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button 
                  onClick={() => { setShowOTP(false); dispatch(clearError()); setOtp(''); }}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  <FiX size={18} />
                </button>
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '32px', color: 'white', marginBottom: '16px', boxShadow: '0 10px 25px rgba(16,185,129,0.4)' }}>✉️</motion.div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Check Your Email</h1>
                <p style={{ color: '#94a3b8', fontSize: '15px', marginTop: '8px', lineHeight: '1.5' }}>We've sent a 6-digit OTP to <strong>{email}</strong></p>
              </div>

              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>Enter OTP</label>
                  <div style={{ position: 'relative' }}>
                    <FiKey style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px' }} />
                    <input type="text" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="Enter 6-digit code" style={{ width: '100%', padding: '14px 18px 14px 48px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', color: 'white', fontSize: '18px', letterSpacing: '4px', outline: 'none', transition: 'all 0.3s ease', textAlign: 'center' }} onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} />
                  </div>
                  {errors.otp && <span style={{ color: '#f87171', fontSize: '13px', marginTop: '4px' }}>{errors.otp}</span>}
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '14px 16px', borderRadius: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span> {error}
                  </motion.div>
                )}

                <motion.button
                  whileHover={!isLoading ? { scale: 1.02, boxShadow: '0 8px 25px rgba(16,185,129,0.4)' } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
                  type="submit" disabled={isLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 700, fontSize: '16px', border: 'none', borderRadius: '16px', marginTop: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
                >
                  {isLoading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> : 'Verify & Login'}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default Login