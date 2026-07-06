import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FiMail, FiLock, FiUser, FiPhone, FiMapPin,
  FiEye, FiEyeOff, FiUserCheck, FiBook,
  FiCalendar, FiAward, FiKey, FiX
} from 'react-icons/fi'
import { registerUser, verifyRegisterUser, clearError } from '../../redux/slices/authSlice'
import registerBg from '../../assets/registerbackground.png'

const Register = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState('student')
  const [showOTP, setShowOTP] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading, error } = useSelector(state => state.auth)

  const { register, handleSubmit, watch, getValues, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    const resultAction = await dispatch(registerUser({
      ...data,
      role
    }))
    if (registerUser.fulfilled.match(resultAction)) {
      setShowOTP(true)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (!otp) {
      setOtpError('Please enter the OTP')
      return
    }
    setOtpError('')
    const formData = getValues()
    const resultAction = await dispatch(verifyRegisterUser({ ...formData, role, otp }))
    if (verifyRegisterUser.fulfilled.match(resultAction)) {
      navigate(`/${role}/dashboard`)
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, x: -50 },
    visible: { 
      opacity: 1, scale: 1, x: 0,
      transition: { duration: 0.6, type: 'spring', damping: 25, stiffness: 120 }
    }
  }

  const textContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 12, stiffness: 100 } }
  }

  return (
    <div className="auth-page-bg" style={{
      display: 'flex', justifyContent: 'flex-start', alignItems: 'center',
      padding: '40px 20px', paddingLeft: 'min(10%, 150px)',
      position: 'relative', overflow: 'hidden', backgroundImage: `url(${registerBg})`
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.1)', zIndex: 0 }} />

      <motion.div 
        variants={containerVariants} initial="hidden" animate="visible"
        style={{
          width: '100%', maxWidth: '700px', background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)', borderTop: '1px solid rgba(255, 255, 255, 0.2)', borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px', padding: '32px', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
          zIndex: 1, position: 'relative', maxHeight: '90vh', overflowY: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}
        className="hide-scrollbar"
      >
        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>

        <AnimatePresence mode="wait">
          {!showOTP ? (
            <motion.div key="regForm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>
              {/* Header */}
              <motion.div variants={textContainerVariants} initial="hidden" animate="visible" style={{ textAlign: 'center', marginBottom: '24px' }}>
                <motion.div variants={itemVariants} animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #10b981, #3b82f6)', fontSize: '24px', color: 'white', marginBottom: '12px', boxShadow: '0 10px 25px rgba(16,185,129,0.3)' }}>🚀</motion.div>
                <motion.h1 variants={itemVariants} style={{ fontSize: '28px', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Create Your Account</motion.h1>
                <motion.p variants={itemVariants} style={{ color: '#94a3b8', fontSize: '14px', marginTop: '6px' }}>Join ExamHub and start your journey today</motion.p>
              </motion.div>

              {/* Role Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
                {[{ id: 'student', label: 'Student', icon: FiUser, color: '#6366f1' }, { id: 'teacher', label: 'Teacher', icon: FiUserCheck, color: '#8b5cf6' }].map((r) => {
                  const Icon = r.icon; const isActive = role === r.id;
                  return (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} key={r.id} type="button" onClick={() => setRole(r.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '14px', border: isActive ? `2px solid ${r.color}` : '2px solid rgba(255,255,255,0.05)', background: isActive ? `rgba(${r.color === '#6366f1' ? '99,102,241' : '139,92,246'}, 0.2)` : 'rgba(255,255,255,0.03)', color: isActive ? 'white' : '#94a3b8', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '14px', fontWeight: 600, boxShadow: isActive ? `0 4px 15px rgba(${r.color === '#6366f1' ? '99,102,241' : '139,92,246'}, 0.2)` : 'none' }}>
                      <Icon style={{ fontSize: '18px', color: isActive ? r.color : '#64748b' }} />{r.label}
                    </motion.button>
                  )
                })}
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Full Name *</label>
                    <div style={{ position: 'relative' }}><FiUser style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px' }} /><input type="text" {...register('name', { required: 'Please fill this Name field', minLength: { value: 2, message: 'Min 2 chars' } })} placeholder="Enter your name" style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', color: 'white', fontSize: '14px', outline: 'none', transition: 'all 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} /></div>
                    {errors.name && <span style={{ color: '#f87171', fontSize: '12px', marginTop: '2px' }}>{errors.name.message}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Email Address *</label>
                    <div style={{ position: 'relative' }}><FiMail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px' }} /><input type="email" {...register('email', { required: 'Please fill this Email field', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' } })} placeholder="Enter your email" style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', color: 'white', fontSize: '14px', outline: 'none', transition: 'all 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} /></div>
                    {errors.email && <span style={{ color: '#f87171', fontSize: '12px', marginTop: '2px' }}>{errors.email.message}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Phone Number *</label>
                    <div style={{ position: 'relative' }}><FiPhone style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px' }} /><input type="text" {...register('phone', { required: 'Please fill this Phone Number field', pattern: { value: /^[0-9]{10}$/, message: 'Must be 10 digits' } })} placeholder="Enter phone number" style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', color: 'white', fontSize: '14px', outline: 'none', transition: 'all 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} /></div>
                    {errors.phone && <span style={{ color: '#f87171', fontSize: '12px', marginTop: '2px' }}>{errors.phone.message}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Department *</label>
                    <div style={{ position: 'relative' }}><FiBook style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px' }} /><input type="text" {...register('department', { required: 'Please fill this Department field' })} placeholder="Enter department" style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', color: 'white', fontSize: '14px', outline: 'none', transition: 'all 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} /></div>
                    {errors.department && <span style={{ color: '#f87171', fontSize: '12px', marginTop: '2px' }}>{errors.department.message}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>College *</label>
                    <div style={{ position: 'relative' }}><FiAward style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px' }} /><input type="text" {...register('college', { required: 'Please fill this College field' })} placeholder="Enter college" style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', color: 'white', fontSize: '14px', outline: 'none', transition: 'all 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} /></div>
                    {errors.college && <span style={{ color: '#f87171', fontSize: '12px', marginTop: '2px' }}>{errors.college.message}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Age *</label>
                    <div style={{ position: 'relative' }}><FiCalendar style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px' }} /><input type="number" {...register('age', { required: 'Please fill this Age field', min: { value: 0, message: 'Must be positive' } })} placeholder="Enter age" style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', color: 'white', fontSize: '14px', outline: 'none', transition: 'all 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} /></div>
                    {errors.age && <span style={{ color: '#f87171', fontSize: '12px', marginTop: '2px' }}>{errors.age.message}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Password *</label>
                    <div style={{ position: 'relative' }}><FiLock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px' }} /><input type={showPassword ? 'text' : 'password'} {...register('password', { required: 'Please fill this Password field', minLength: { value: 6, message: 'Min 6 chars' }})} placeholder="Enter password" style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', color: 'white', fontSize: '14px', outline: 'none', transition: 'all 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} /><button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}>{showPassword ? <FiEyeOff /> : <FiEye />}</button></div>
                    {errors.password && <span style={{ color: '#f87171', fontSize: '12px', marginTop: '2px' }}>{errors.password.message}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Confirm Password *</label>
                    <div style={{ position: 'relative' }}><FiLock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px' }} /><input type={showConfirmPassword ? 'text' : 'password'} {...register('confirmPassword', { required: 'Please fill this Confirm Password field', validate: (val) => val === watch('password') || 'Passwords mismatch' })} placeholder="Confirm password" style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', color: 'white', fontSize: '14px', outline: 'none', transition: 'all 0.3s ease' }} onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}>{showConfirmPassword ? <FiEyeOff /> : <FiEye />}</button></div>
                    {errors.confirmPassword && <span style={{ color: '#f87171', fontSize: '12px', marginTop: '2px' }}>{errors.confirmPassword.message}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Address *</label>
                    <div style={{ position: 'relative' }}><FiMapPin style={{ position: 'absolute', left: '16px', top: '16px', color: '#64748b', fontSize: '16px' }} /><textarea {...register('address', { required: 'Please fill this Address field' })} placeholder="Enter your address" rows="2" style={{ width: '100%', padding: '12px 16px 12px 42px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', color: 'white', fontSize: '14px', outline: 'none', transition: 'all 0.3s ease', minHeight: '60px', resize: 'vertical' }} onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} /></div>
                    {errors.address && <span style={{ color: '#f87171', fontSize: '12px', marginTop: '2px' }}>{errors.address.message}</span>}
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '14px 16px', borderRadius: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span> {error}
                  </motion.div>
                )}

                <motion.button whileHover={!isLoading ? { scale: 1.01, boxShadow: '0 8px 25px rgba(16,185,129,0.3)' } : {}} whileTap={!isLoading ? { scale: 0.99 } : {}} type="submit" disabled={isLoading} style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: 'white', fontWeight: 700, fontSize: '15px', border: 'none', borderRadius: '14px', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}>
                  {isLoading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: '18px', height: '18px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> : 'Send OTP'}
                </motion.button>
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginTop: '20px' }}>Already have an account? <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Login here</Link></div>
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
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', fontSize: '32px', color: 'white', marginBottom: '16px', boxShadow: '0 10px 25px rgba(59,130,246,0.4)' }}>✉️</motion.div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>Check Your Email</h1>
                <p style={{ color: '#94a3b8', fontSize: '15px', marginTop: '8px', lineHeight: '1.5' }}>We've sent a 6-digit OTP to complete your registration.</p>
              </div>

              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>Enter OTP</label>
                  <div style={{ position: 'relative' }}>
                    <FiKey style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px' }} />
                    <input type="text" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="Enter 6-digit code" style={{ width: '100%', padding: '14px 18px 14px 48px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', color: 'white', fontSize: '18px', letterSpacing: '4px', outline: 'none', transition: 'all 0.3s ease', textAlign: 'center' }} onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = 'rgba(255, 255, 255, 0.1)' }} onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.target.style.background = 'rgba(255, 255, 255, 0.05)' }} />
                  </div>
                  {otpError && <span style={{ color: '#f87171', fontSize: '13px', marginTop: '4px' }}>{otpError}</span>}
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '14px 16px', borderRadius: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span> {error}
                  </motion.div>
                )}

                <motion.button
                  whileHover={!isLoading ? { scale: 1.02, boxShadow: '0 8px 25px rgba(59,130,246,0.4)' } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
                  type="submit" disabled={isLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', fontWeight: 700, fontSize: '16px', border: 'none', borderRadius: '16px', marginTop: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1 }}
                >
                  {isLoading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> : 'Verify & Register'}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default Register