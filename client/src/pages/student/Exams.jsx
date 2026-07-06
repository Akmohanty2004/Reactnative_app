import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  FiSearch, FiCalendar, FiClock, FiUser, 
  FiLock, FiPlay, FiCheckCircle, FiXCircle,
  FiInfo, FiAlertCircle
} from 'react-icons/fi'
import { getStudentExams } from '../../redux/slices/examSlice'
import { getStudentResults } from '../../redux/slices/resultSlice'
import toast from '../../utils/toast'

const StudentExams = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedExam, setSelectedExam] = useState(null)
  const [password, setPassword] = useState('')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showExamInfo, setShowExamInfo] = useState(null)
  
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { exams } = useSelector(state => state.exams)
  const { results } = useSelector(state => state.results)

  useEffect(() => {
    dispatch(getStudentExams())
    dispatch(getStudentResults())
  }, [dispatch])

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exam.subject?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || 
                         (filter === 'upcoming' && exam.isUpcoming) ||
                         (filter === 'available' && exam.isAvailable && !exam.isTaken) ||
                         (filter === 'completed' && exam.isTaken)
    return matchesSearch && matchesFilter
  })

  const handleStartExam = (exam) => {
    // Check if exam is available
    if (!exam.isAvailable) {
      if (exam.isUpcoming) {
        toast.info(`Exam starts at ${exam.startTime} on ${new Date(exam.date).toLocaleDateString()}`)
      } else {
        toast.error('You are late! Exam entry time has ended.')
      }
      return
    }
    setSelectedExam(exam)
    setShowPasswordModal(true)
    setPassword('')
  }

  const handlePasswordSubmit = async () => {
    try {
      // Verify password with backend
      const response = await axios.post(`/api/exams/${selectedExam._id}/verify-password`, { password })
      
      if (response.data.valid) {
        setShowPasswordModal(false)
        navigate(`/student/exam/${selectedExam._id}`)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Incorrect password!')
    }
  }

  const getStatusBadge = (exam) => {
    if (exam.isTaken) {
      const result = results?.find(r => r.examId?._id === exam._id)
      if (result?.isPublished) {
        return { label: result?.isPassed ? 'Passed' : 'Failed', color: result?.isPassed ? 'badge-success' : 'badge-danger' }
      }
      return { label: 'Result Pending', color: 'badge-warning' }
    }
    if (exam.isAvailable) {
      return { label: 'Available', color: 'badge-warning' }
    }
    if (exam.isUpcoming) {
      return { label: 'Upcoming', color: 'badge-info' }
    }
    return { label: 'Expired', color: 'badge-danger' }
  }

  const formatTime = (time) => {
    if (!time) return 'N/A'
    const [h, m] = time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${m} ${ampm}`
  }

  return (
    <div>
      <div className="welcome-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2>My Exams</h2>
            <p>View and take your exams</p>
          </div>
          <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: '500' }}>
            {exams.filter(e => e.isAvailable && !e.isTaken).length} available
          </span>
        </div>
      </div>

      {/* Search and Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="input-group" style={{ flex: 1, minWidth: '200px' }}>
          <FiSearch className="icon" />
          <input
            type="text"
            placeholder="Search exams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '48px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'available', 'upcoming', 'completed'].map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--border-radius)',
                border: 'none',
                background: filter === option ? 'var(--primary-500)' : 'var(--dark-700)',
                color: filter === option ? 'white' : 'var(--dark-400)',
                cursor: 'pointer',
                transition: 'var(--transition)',
                fontWeight: '500',
                fontSize: '14px',
                textTransform: 'capitalize'
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Exams List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredExams.map((exam, index) => {
          const status = getStatusBadge(exam)
          const result = results?.find(r => r.examId?._id === exam._id)
          
          return (
            <motion.div
              key={exam._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ color: 'white', fontSize: '18px' }}>{exam.title}</h3>
                    <span className={`badge ${status.color}`}>
                      {status.label}
                    </span>

                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px', color: 'var(--dark-400)', fontSize: '14px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FiUser style={{ color: 'var(--primary-400)' }} />
                      {exam.createdBy?.name || 'Unknown'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FiCalendar style={{ color: 'var(--primary-400)' }} />
                      {new Date(exam.date).toLocaleDateString()}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FiClock style={{ color: 'var(--primary-400)' }} />
                      {formatTime(exam.startTime)} - {formatTime(exam.endTime)} ({exam.duration} min)
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FiLock style={{ color: 'var(--primary-400)' }} />
                      Password protected
                    </span>
                  </div>
                  {/* Show exam details */}
                  <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--dark-400)' }}>
                    <span>Subject: {exam.subject}</span>
                    {exam.description && <span style={{ marginLeft: '16px' }}>• {exam.description.substring(0, 50)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setShowExamInfo(exam)}
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '14px' }}
                    title="View Exam Details"
                  >
                    <FiInfo />
                  </button>
                  {exam.isTaken ? (
                    <button
                      onClick={() => navigate('/student/results')}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '14px' }}
                    >
                      View Result
                    </button>
                  ) : exam.isAvailable ? (
                    <button
                      onClick={() => handleStartExam(exam)}
                      className="btn-primary"
                      style={{ padding: '8px 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FiPlay />
                      Start Exam
                    </button>
                  ) : exam.isUpcoming ? (
                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '14px', opacity: 0.5, cursor: 'not-allowed' }}>
                      <FiClock /> Coming Soon
                    </button>
                  ) : (
                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '14px', opacity: 0.5, cursor: 'not-allowed' }}>
                      <FiXCircle /> Expired
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
        {filteredExams.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--dark-400)' }}>
            <p>No exams found</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Check back later for new exams</p>
          </div>
        )}
      </div>

      {/* Exam Info Modal */}
      {showExamInfo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card"
            style={{ maxWidth: '500px', width: '100%', padding: '32px' }}
          >
            <h3 style={{ color: 'white', fontSize: '20px', marginBottom: '8px' }}>{showExamInfo.title}</h3>
            <div style={{ color: 'var(--dark-400)', fontSize: '14px', lineHeight: '1.8' }}>
              <p><strong>Subject:</strong> {showExamInfo.subject}</p>
              <p><strong>Teacher:</strong> {showExamInfo.createdBy?.name || 'Unknown'}</p>
              <p><strong>Date:</strong> {new Date(showExamInfo.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {formatTime(showExamInfo.startTime)} - {formatTime(showExamInfo.endTime)}</p>
              <p><strong>Duration:</strong> {showExamInfo.duration} minutes</p>
              <p><strong>Total Marks:</strong> {showExamInfo.maxMarks || 'N/A'}</p>
              <p><strong>Passing Marks:</strong> {showExamInfo.passingMarks || 'N/A'}</p>
              {showExamInfo.description && <p><strong>Description:</strong> {showExamInfo.description}</p>}
              {showExamInfo.instructions && <p><strong>Instructions:</strong> {showExamInfo.instructions}</p>}
              <p><strong>Late Entry Allowed:</strong> Up to {showExamInfo.entryTime || 15} minutes after start</p>
              <p><strong>Status:</strong> {showExamInfo.isTaken ? 'Completed' : showExamInfo.isAvailable ? 'Available' : showExamInfo.isUpcoming ? 'Upcoming' : 'Expired'}</p>
            </div>
            <button
              onClick={() => setShowExamInfo(null)}
              className="btn-primary"
              style={{ width: '100%', marginTop: '20px' }}
            >
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && selectedExam && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card"
            style={{ maxWidth: '400px', width: '100%', padding: '32px' }}
          >
            <h3 style={{ color: 'white', fontSize: '20px', marginBottom: '8px' }}>Enter Exam Password</h3>
            <p style={{ color: 'var(--dark-400)', fontSize: '14px', marginBottom: '20px' }}>
              This exam is password protected. Enter the password to continue.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter exam password"
                className="input-field"
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPassword('')
                  }}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  Start Exam
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default StudentExams
