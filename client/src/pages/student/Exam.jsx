import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { 
  FiClock, FiChevronLeft, FiChevronRight, 
  FiCamera, FiMic, FiMicOff, FiCameraOff, FiMonitor
} from 'react-icons/fi'
import Webcam from 'react-webcam'
import { getStudentExam } from '../../redux/slices/examSlice'
import { submitExam } from '../../redux/slices/resultSlice'
import toast from '../../utils/toast'
import Calculator from '../../components/common/Calculator'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Exam ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'white', background: 'red', zIndex: 999999, position: 'relative' }}>
          <h2>Something went wrong in Exam.jsx.</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const StudentExamContent = () => {
  const { examId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { currentExam, error, isLoading } = useSelector(state => state.exams)
  const { user } = useSelector(state => state.auth)
  
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [questionStatus, setQuestionStatus] = useState({})
  const [showCalculator, setShowCalculator] = useState(false)
  const [isStarted, setIsStarted] = useState(false)
  
  const forceSubmitExamRef = useRef(null)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  
  const webcamRef = useRef(null)
  const timerRef = useRef(null)
  const answersRef = useRef(answers)
  const tabSwitchCountRef = useRef(tabSwitchCount)
  const scrollRef = useRef(null)
  const isSubmittedRef = useRef(isSubmitted)

  // Keep refs in sync with state for accurate auto-submission
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    tabSwitchCountRef.current = tabSwitchCount
  }, [tabSwitchCount])

  useEffect(() => {
    isSubmittedRef.current = isSubmitted
  }, [isSubmitted])


  useEffect(() => {
    dispatch(getStudentExam(examId))
    
    // Prevent copy paste
    const preventCopy = (e) => {
      e.preventDefault()
      toast.warning('Copy paste is disabled during exam')
    }
    document.addEventListener('copy', preventCopy)
    document.addEventListener('paste', preventCopy)
    document.addEventListener('contextmenu', preventCopy)

    return () => {
      document.removeEventListener('copy', preventCopy)
      document.removeEventListener('paste', preventCopy)
      document.removeEventListener('contextmenu', preventCopy)
      clearInterval(timerRef.current)
    }
  }, [dispatch, examId])

  useEffect(() => {
    const examObject = currentExam?.exam || currentExam
    if (!examObject || !isStarted || Object.keys(examObject).length === 0) return;
    
    if (examObject.fullscreenMode !== false) {
      // Prevent tab switching
      const handleVisibilityChange = () => {
        if (document.hidden && !isSubmittedRef.current) {
          isSubmittedRef.current = true
          tabSwitchCountRef.current += 1
          setTabSwitchCount(prev => prev + 1)
          toast.error('Warning: Tab switching detected! Exam auto-submitted.', { autoClose: false, toastId: 'tab-switch' })
          forceSubmitExamRef.current()
        }
      }
      
      const handleBlur = () => {
        if (!isSubmittedRef.current) {
          isSubmittedRef.current = true
          tabSwitchCountRef.current += 1
          setTabSwitchCount(prev => prev + 1)
          toast.error('Warning: Window unfocused! Exam auto-submitted.', { autoClose: false, toastId: 'window-blur' })
          forceSubmitExamRef.current()
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // Mobile devices often fire blur events falsely (e.g. when opening keyboard or scrolling)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (!isMobile) {
        window.addEventListener('blur', handleBlur)
      }

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        if (!isMobile) {
          window.removeEventListener('blur', handleBlur)
        }
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => console.log(err))
        }
      }
    }
  }, [currentExam, isStarted])



  useEffect(() => {
    const examObject = currentExam?.exam || currentExam
    if (examObject && Object.keys(examObject).length > 0) {
      const exam = examObject
      const now = new Date()
      const examDate = new Date(exam.date)
      const [hours, minutes] = exam.startTime.split(':')
      examDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      const endTime = new Date(examDate.getTime() + exam.duration * 60000)
      
      // Calculate how much time is left until the absolute hard end of the exam
      const hardEndTimeStr = exam.endTime; // e.g., "21:51"
      const hardEndDateTime = new Date(exam.date);
      const [endHours, endMinutes] = hardEndTimeStr.split(':');
      hardEndDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      // Personal duration in seconds
      const personalDurationSeconds = exam.duration * 60;
      
      // Time left until hard end time in seconds
      const timeUntilHardEnd = Math.max(0, Math.floor((hardEndDateTime - now) / 1000));
      
      // The student gets their personal duration, but it's cut short if the exam's hard end time is sooner.
      const remaining = Math.min(personalDurationSeconds, timeUntilHardEnd);
      setTimeLeft(remaining)

      // Initialize question status
      const status = {}
      currentExam.questions?.forEach((_, index) => {
        status[index] = 'not-answered'
      })
      setQuestionStatus(status)
      
      if (isStarted) {
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current)
              handleAutoSubmit()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    }
  }, [currentExam, isStarted])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [currentQuestion])

  const handleAutoSubmit = () => {
    if (!isSubmitted) {
      toast.info('Time is up! Submitting your exam...')
      handleSubmitExam()
    }
  }

  const handleAnswerSelect = (questionIndex, answer) => {
    const questionsList = currentExam?.questions || []
    setAnswers(prev => ({
      ...prev,
      [questionsList[questionIndex]?._id]: answer
    }))
    setQuestionStatus(prev => ({
      ...prev,
      [questionIndex]: 'answered'
    }))
  }

  const handleSubmitExam = async () => {
    if (isSubmitted) return
    
    const confirmSubmit = window.confirm('Are you sure you want to submit the exam?')
    if (!confirmSubmit) return

    await forceSubmitExam()
  }

  const handleExitExam = async () => {
    if (isSubmitted) return
    
    const confirmExit = window.confirm('Are you sure you want to exit? Your exam will be submitted as-is and you cannot retake it.')
    if (!confirmExit) return

    await forceSubmitExam()
  }

  const forceSubmitExam = async () => {
    setIsSubmitted(true)
    isSubmittedRef.current = true
    clearInterval(timerRef.current)

    // Stop webcam tracks if they exist
    if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.srcObject) {
      const tracks = webcamRef.current.video.srcObject.getTracks()
      tracks.forEach(track => track.stop())
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log(err))
    }

    const formattedAnswers = Object.entries(answersRef.current).map(([questionId, selectedAnswer]) => ({
      questionId,
      selectedAnswer
    }))

    const examObject = currentExam?.exam || currentExam
    const timeTaken = Math.floor((examObject.duration * 60 - timeLeft) / 60)
    
    await dispatch(submitExam({
      examId,
      answers: formattedAnswers,
      timeTaken,
      tabSwitches: tabSwitchCountRef.current
    }))

    toast.success('Exam submitted successfully!')
    navigate('/student/exams')
  }

  useEffect(() => {
    forceSubmitExamRef.current = forceSubmitExam
  }, [forceSubmitExam])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }



  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--dark-900)' }}>
        <div style={{ color: 'var(--dark-400)', fontSize: '18px' }}>Loading exam...</div>
      </div>
    )
  }

  if (!currentExam && !error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--dark-900)', flexDirection: 'column' }}>
        <div style={{ color: 'var(--warning)', fontSize: '24px', marginBottom: '10px' }}>DEBUG: No currentExam and No error.</div>
        <div style={{ color: 'white' }}>Exam ID from URL: {examId}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--dark-900)' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px', maxWidth: '500px' }}>
          <FiClock style={{ fontSize: '48px', color: 'var(--warning)', marginBottom: '20px' }} />
          <h2 style={{ color: 'white', marginBottom: '10px' }}>Exam Unavailable</h2>
          <p style={{ color: 'var(--dark-400)', marginBottom: '20px' }}>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/student/exams')}>
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const exam = currentExam?.exam || currentExam
  const questions = currentExam?.questions || []

  if (!exam || Object.keys(exam).length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--dark-900)' }}>
        <div style={{ color: 'var(--dark-400)', fontSize: '18px' }}>Loading exam details...</div>
      </div>
    )
  }

  if (!isStarted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--dark-900)' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px', maxWidth: '500px' }}>
          <h2 style={{ color: 'white', marginBottom: '20px' }}>Ready to Start?</h2>
          <p style={{ color: 'var(--dark-400)', marginBottom: '30px' }}>
            Click the button below to begin your exam. 
            {exam.fullscreenMode !== false && " This will open the exam in fullscreen mode."}
          </p>
          <button 
            className="btn-primary" 
            onClick={async () => {
              if (exam.fullscreenMode !== false) {
                try {
                  if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen()
                  }
                } catch (err) {
                  toast.warning('Please enable fullscreen mode for the exam')
                }
              }
              setIsStarted(true)
            }} 
            style={{ padding: '12px 24px', fontSize: '16px' }}
          >
            Begin Exam
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      background: 'var(--dark-900)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9999
    }}>
      {/* Webcam */}
      {exam?.enableCamera !== false && (
        <div style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          width: '200px',
          height: '150px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '2px solid rgba(99, 102, 241, 0.4)',
          boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
          zIndex: 10000,
          background: 'var(--dark-800)'
        }}>
          {isCameraOn && navigator.mediaDevices ? (
            <Webcam
              ref={webcamRef}
              audio={isMicOn && exam?.enableMicrophone !== false}
              videoConstraints={{ facingMode: 'user' }}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onUserMediaError={(err) => {
                console.warn("Webcam error:", err);
                setIsCameraOn(false);
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--dark-800)' }}>
              <FiCameraOff style={{ fontSize: '32px', color: 'var(--dark-400)', marginBottom: '8px' }} />
              {!navigator.mediaDevices && <span style={{ fontSize: '10px', color: 'var(--danger)', textAlign: 'center' }}>HTTPS required for camera</span>}
            </div>
          )}
          <div style={{ position: 'absolute', bottom: '8px', left: '8px', display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              style={{ padding: '4px 10px', borderRadius: '50px', border: 'none', background: 'rgba(15,23,42,0.8)', color: 'white', cursor: 'pointer', fontSize: '12px' }}
            >
              {isCameraOn ? <FiCamera style={{ fontSize: '14px' }} /> : <FiCameraOff style={{ fontSize: '14px' }} />}
            </button>
            {exam?.enableMicrophone !== false && (
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                style={{ padding: '4px 10px', borderRadius: '50px', border: 'none', background: 'rgba(15,23,42,0.8)', color: 'white', cursor: 'pointer', fontSize: '12px' }}
              >
                {isMicOn ? <FiMic style={{ fontSize: '14px' }} /> : <FiMicOff style={{ fontSize: '14px' }} />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'rgba(15,23,42,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 600 }}>{exam.title}</h2>
          <p style={{ color: 'var(--dark-400)', fontSize: '13px' }}>{exam.subject}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiClock style={{ color: 'var(--primary-400)', fontSize: '22px' }} />
            <span style={{ 
              fontSize: '28px', 
              fontWeight: 700,
              color: timeLeft < 300 ? 'var(--danger)' : 'white'
            }}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--dark-400)' }}>
            {Object.values(questionStatus).filter(s => s === 'answered').length} / {questions.length}
          </div>
          {exam?.allowCalculator && (
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)',
                background: showCalculator ? 'var(--primary-500)' : 'rgba(15,23,42,0.8)',
                color: 'white', cursor: 'pointer', fontSize: '14px'
              }}
            >
              <FiMonitor /> Calculator
            </button>
          )}
          <button
            onClick={handleExitExam}
            disabled={isSubmitted}
            className="btn-secondary"
            style={{ padding: '8px 20px', fontSize: '14px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            Exit Exam
          </button>
          <button
            onClick={handleSubmitExam}
            disabled={isSubmitted}
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: '14px' }}
          >
            Submit Exam
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Questions */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }} ref={scrollRef}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', fontSize: '14px', color: 'var(--dark-400)' }}>
              <span>Total Questions: {questions.length}</span>
              <span style={{ padding: '4px 12px', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-400)', borderRadius: '50px' }}>
                {exam?.maxMarks && questions.length ? (exam.maxMarks / questions.length).toFixed(1) : 0} marks
              </span>
            </div>

            {questions.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                <h2 style={{ color: 'var(--danger)', marginBottom: '16px' }}>No Questions Found!</h2>
                <p style={{ color: 'var(--dark-400)' }}>The backend returned 0 questions for this exam.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div className="card" id={`question-${currentQuestion}`}>
                  {/* Question */}
                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ color: 'var(--text-main, white)', fontSize: '18px', fontWeight: 500, lineHeight: 1.7 }}>
                      <span style={{ marginRight: '8px', color: 'var(--primary-400)' }}>{currentQuestion + 1}.</span> 
                      {questions[currentQuestion].question}
                    </p>
                    {questions[currentQuestion].image && (
                      <img 
                        src={questions[currentQuestion].image} 
                        alt="Question"
                        style={{ marginTop: '16px', maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', objectFit: 'contain' }}
                      />
                    )}
                  </div>

                  {/* Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {questions[currentQuestion].type === 'mcq' && questions[currentQuestion].options?.map((option, optIndex) => {
                      const isSelected = answers[questions[currentQuestion]._id] === option.text
                      return (
                        <button
                          key={optIndex}
                          onClick={() => handleAnswerSelect(currentQuestion, option.text)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '14px 18px',
                            background: isSelected ? 'rgba(99,102,241,0.15)' : 'var(--dark-800)',
                            border: isSelected ? '2px solid var(--primary-500)' : '2px solid rgba(255,255,255,0.05)',
                            borderRadius: 'var(--border-radius)',
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                            width: '100%',
                            textAlign: 'left'
                          }}
                        >
                          <span style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--primary-500)' : 'var(--dark-700)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: isSelected ? 'white' : 'var(--dark-400)',
                            flexShrink: 0
                          }}>
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <span style={{ color: 'var(--text-main, white)', fontSize: '15px' }}>{option.text}</span>
                        </button>
                      )
                    })}

                    {questions[currentQuestion].type === 'truefalse' && (
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {['true', 'false'].map((val) => {
                          const isSelected = answers[questions[currentQuestion]._id] === val;
                          return (
                            <button
                              key={val}
                              onClick={() => handleAnswerSelect(currentQuestion, val)}
                              style={{
                                flex: 1,
                                padding: '16px',
                                background: isSelected ? 'rgba(99,102,241,0.15)' : 'var(--dark-800)',
                                border: isSelected ? '2px solid var(--primary-500)' : '2px solid rgba(255,255,255,0.05)',
                                borderRadius: 'var(--border-radius)',
                                color: isSelected ? 'var(--primary-400)' : 'var(--dark-400)',
                                fontSize: '16px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textTransform: 'capitalize'
                              }}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {questions[currentQuestion].type === 'text' && (
                      <div>
                        <input
                          type="text"
                          value={answers[questions[currentQuestion]._id] || ''}
                          onChange={(e) => handleAnswerSelect(currentQuestion, e.target.value)}
                          placeholder="Type your answer here..."
                          style={{
                            width: '100%',
                            padding: '16px',
                            background: 'var(--dark-800)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 'var(--border-radius)',
                            color: 'var(--text-main, white)',
                            fontSize: '16px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
                  <button
                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestion === 0}
                    className="btn-secondary"
                    style={{ 
                      padding: '10px 20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      opacity: currentQuestion === 0 ? 0.5 : 1,
                      cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <FiChevronLeft /> Previous
                  </button>
                  <button
                    onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
                    disabled={currentQuestion === questions.length - 1}
                    className="btn-primary"
                    style={{ 
                      padding: '10px 20px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      opacity: currentQuestion === questions.length - 1 ? 0.5 : 1,
                      cursor: currentQuestion === questions.length - 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next <FiChevronRight />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Question Palette */}
        <div style={{
          width: '180px',
          background: 'rgba(15,23,42,0.6)',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          padding: '20px',
          overflowY: 'auto',
          flexShrink: 0
        }}>
          <h4 style={{ fontSize: '13px', color: 'var(--dark-400)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Question Palette
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {questions.map((_, index) => {
              let buttonStyle = {
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'var(--transition)',
              }
              
              if (currentQuestion === index) {
                buttonStyle.background = 'var(--primary-500)'
                buttonStyle.color = 'white'
                buttonStyle.border = '2px solid var(--primary-500)'
              } else if (questionStatus[index] === 'answered') {
                buttonStyle.background = 'rgba(16,185,129,0.2)'
                buttonStyle.color = 'var(--success)'
                buttonStyle.border = '1px solid rgba(16,185,129,0.3)'
              } else {
                buttonStyle.background = 'var(--dark-700)'
                buttonStyle.color = 'var(--dark-400)'
                buttonStyle.border = 'none'
              }
              
              return (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  style={buttonStyle}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--dark-400)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }} />
              <span>Answered</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--dark-400)' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'var(--dark-700)' }} />
              <span>Not Answered</span>
            </div>
          </div>
        </div>
      </div>

      {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}

      {/* Warning */}
      {timeLeft < 60 && timeLeft > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--danger-bg)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--danger)',
          padding: '12px 24px',
          borderRadius: 'var(--border-radius)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 500,
          zIndex: 10001
        }}>
          ⚠️ Less than a minute remaining!
        </div>
      )}
    </div>
  )
}

const StudentExam = () => (
  <ErrorBoundary>
    <StudentExamContent />
  </ErrorBoundary>
)

export default StudentExam
