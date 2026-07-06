import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import { 
  FiPlus, FiTrash2, FiSave, FiSend, FiImage, 
  FiX, FiCheck, FiClock, FiCalendar, FiLock, 
  FiUsers, FiBarChart2, FiSettings, FiChevronRight,
  FiChevronLeft, FiCopy, FiEye, FiEyeOff
} from 'react-icons/fi'
import { createExam } from '../../redux/slices/examSlice'
import toast from '../../utils/toast'

const CreateExam = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  
  // Exam Data
  const [examData, setExamData] = useState({
    title: '',
    subject: '',
    description: '',
    instructions: '',
    password: '',
    date: '',
    startTime: '',
    endTime: '',
    entryTime: 15,
    duration: 60,
    targetQuestions: 10,
    maxMarks: 100,
    passingMarks: 40,
    negativeMarking: false,
    negativeMarkValue: 0.25,
    randomQuestions: false,
    allowCalculator: false,
    fullscreenMode: true,
    enableCamera: true,
    enableMicrophone: true,
    maxAttempts: 1
  })

  // Questions
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    marks: 1,
    image: null,
    explanation: ''
  })

  const handleExamDataChange = (e) => {
    const { name, value, type, checked } = e.target
    setExamData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const addQuestion = () => {
    if (questions.length >= examData.targetQuestions) {
      toast.error(`You have already reached your target of ${examData.targetQuestions} questions!`)
      return
    }

    if (!currentQuestion.question.trim()) {
      toast.error('Please enter a question')
      return
    }
    
    if (currentQuestion.type === 'mcq' && currentQuestion.options.some(opt => !opt.trim())) {
      toast.error('Please fill all options')
      return
    }

    if (currentQuestion.type === 'mcq' && currentQuestion.correctAnswer === null) {
      toast.error('Please select the correct answer')
      return
    }

    if (currentQuestion.type === 'truefalse' && currentQuestion.correctAnswer !== 'true' && currentQuestion.correctAnswer !== 'false') {
      toast.error('Please select True or False as the correct answer')
      return
    }

    if (currentQuestion.type === 'text' && (!currentQuestion.correctAnswer || currentQuestion.correctAnswer === 0)) {
      toast.error('Please enter the expected correct answer for this text question')
      return
    }

    setQuestions([...questions, { 
      ...currentQuestion, 
      id: Date.now(),
      options: currentQuestion.type === 'mcq' ? currentQuestion.options.map(opt => ({ text: opt })) : []
    }])
    
    setCurrentQuestion({
      type: 'mcq',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      marks: 1,
      image: null,
      explanation: ''
    })
    
    toast.success('Question added successfully')
  }

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id))
    toast.success('Question removed successfully')
  }

  const duplicateQuestion = (id) => {
    const question = questions.find(q => q.id === id)
    if (question) {
      setQuestions([...questions, { ...question, id: Date.now() }])
      toast.success('Question duplicated')
    }
  }

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options]
    newOptions[index] = value
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        setCurrentQuestion(prev => ({ ...prev, image: event.target.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async () => {
    if (questions.length === 0) {
      toast.error('Please add at least one question. Fill out the question form and click "Add Question" first.')
      return
    }

    if (questions.length !== parseInt(examData.targetQuestions)) {
      toast.error(`Please add exactly ${examData.targetQuestions} questions. You have added ${questions.length}.`)
      return
    }

    if (!examData.title || !examData.subject || !examData.password || 
        !examData.date || !examData.startTime || !examData.endTime) {
      toast.error('Please fill all required fields in Step 1')
      return
    }

    const examPayload = {
      ...examData,
      questions: questions.map(q => ({
        type: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: q.type === 'mcq' ? q.options[q.correctAnswer].text : q.correctAnswer,
        marks: q.marks,
        image: q.image,
        explanation: q.explanation
      }))
    }

    try {
      const result = await dispatch(createExam(examPayload)).unwrap()
      navigate('/teacher/exams')
    } catch (error) {
      // The slice already toasts the error, no need to toast here
    }
  }

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Basic Details */}
      <div className="card">
        <h3 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>📝 Basic Details</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Exam Title *</label>
            <input
              type="text"
              name="title"
              value={examData.title}
              onChange={handleExamDataChange}
              placeholder="Enter exam title"
              className="input-field"
              required
            />
          </div>
          <div className="form-group">
            <label>Subject *</label>
            <input
              type="text"
              name="subject"
              value={examData.subject}
              onChange={handleExamDataChange}
              placeholder="Enter subject"
              className="input-field"
              required
            />
          </div>
          <div className="form-group full-width">
            <label>Description</label>
            <textarea
              name="description"
              value={examData.description}
              onChange={handleExamDataChange}
              placeholder="Enter exam description"
              className="input-field"
              rows="2"
            />
          </div>
          <div className="form-group full-width">
            <label>Instructions</label>
            <textarea
              name="instructions"
              value={examData.instructions}
              onChange={handleExamDataChange}
              placeholder="Enter exam instructions for students"
              className="input-field"
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>Target Number of Questions *</label>
            <input
              type="number"
              name="targetQuestions"
              value={examData.targetQuestions}
              onChange={handleExamDataChange}
              min="1"
              className="input-field"
              required
            />
          </div>
        </div>
      </div>

      {/* Timing & Scheduling */}
      <div className="card">
        <h3 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>⏰ Timing & Scheduling</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Exam Date *</label>
            <input
              type="date"
              name="date"
              value={examData.date}
              onChange={handleExamDataChange}
              className="input-field"
              required
            />
          </div>
          <div className="form-group">
            <label>Start Time *</label>
            <input
              type="time"
              name="startTime"
              value={examData.startTime}
              onChange={handleExamDataChange}
              className="input-field"
              required
            />
          </div>
          <div className="form-group">
            <label>End Time *</label>
            <input
              type="time"
              name="endTime"
              value={examData.endTime}
              onChange={handleExamDataChange}
              className="input-field"
              required
            />
          </div>
          <div className="form-group">
            <label>Entry Time (minutes after start)</label>
            <input
              type="number"
              name="entryTime"
              value={examData.entryTime}
              onChange={handleExamDataChange}
              min="0"
              max="60"
              className="input-field"
            />
            <small style={{ color: 'var(--dark-400)', fontSize: '12px' }}>
              Students can join up to this many minutes after start time
            </small>
          </div>
          <div className="form-group">
            <label>Duration (minutes) *</label>
            <input
              type="number"
              name="duration"
              value={examData.duration}
              onChange={handleExamDataChange}
              min="1"
              max="480"
              className="input-field"
              required
            />
          </div>
        </div>
      </div>

      {/* Marks & Grading */}
      <div className="card">
        <h3 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>📊 Marks & Grading</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Maximum Marks *</label>
            <input
              type="number"
              name="maxMarks"
              value={examData.maxMarks}
              onChange={handleExamDataChange}
              min="1"
              className="input-field"
              required
            />
          </div>
          <div className="form-group">
            <label>Passing Marks *</label>
            <input
              type="number"
              name="passingMarks"
              value={examData.passingMarks}
              onChange={handleExamDataChange}
              min="0"
              className="input-field"
              required
            />
          </div>
          <div className="form-group">
            <label>Maximum Attempts</label>
            <input
              type="number"
              name="maxAttempts"
              value={examData.maxAttempts}
              onChange={handleExamDataChange}
              min="1"
              max="5"
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Security & Access */}
      <div className="card">
        <h3 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>🔒 Security & Access</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Exam Password *</label>
            <div className="input-group">
              <FiLock className="icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={examData.password}
                onChange={handleExamDataChange}
                placeholder="Set exam password"
                className="input-field"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <small style={{ color: 'var(--dark-400)', fontSize: '12px' }}>
              Students must enter this password to start the exam
            </small>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="card">
        <h3 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>⚙️ Advanced Settings</h3>
        <div className="settings-grid">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="negativeMarking"
              checked={examData.negativeMarking}
              onChange={handleExamDataChange}
            />
            <span>Enable Negative Marking</span>
          </label>
          {examData.negativeMarking && (
            <div className="form-group">
              <label>Negative Mark Value</label>
              <input
                type="number"
                name="negativeMarkValue"
                value={examData.negativeMarkValue}
                onChange={handleExamDataChange}
                step="0.01"
                min="0"
                max="1"
                className="input-field"
              />
            </div>
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="randomQuestions"
              checked={examData.randomQuestions}
              onChange={handleExamDataChange}
            />
            <span>Randomize Questions</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="allowCalculator"
              checked={examData.allowCalculator}
              onChange={handleExamDataChange}
            />
            <span>Allow Calculator</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="fullscreenMode"
              checked={examData.fullscreenMode}
              onChange={handleExamDataChange}
            />
            <span>Force Fullscreen Mode</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="enableCamera"
              checked={examData.enableCamera}
              onChange={handleExamDataChange}
            />
            <span>Enable Camera Monitoring</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="enableMicrophone"
              checked={examData.enableMicrophone}
              onChange={handleExamDataChange}
            />
            <span>Enable Microphone Monitoring</span>
          </label>
        </div>
      </div>

      <div className="form-actions">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          Next: Add Questions <FiChevronRight />
        </button>
      </div>
    </motion.div>
  )

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Question Tracker Sticky Widget */}
      <div style={{
        position: 'sticky',
        top: '20px',
        zIndex: 50,
        background: 'var(--dark-800)',
        border: '1px solid var(--primary-500)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        marginBottom: '20px'
      }}>
        <div>
          <h4 style={{ color: 'var(--text-main)', margin: 0, fontSize: '16px' }}>Target Questions: {examData.targetQuestions}</h4>
          <p style={{ color: 'var(--dark-400)', fontSize: '14px', margin: '6px 0 0 0' }}>
            Added: <span style={{ color: '#10b981', fontWeight: 'bold' }}>{questions.length}</span> | 
            Remaining: <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{Math.max(0, examData.targetQuestions - questions.length)}</span>
          </p>
        </div>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: questions.length == examData.targetQuestions ? '#10b981' : 'var(--dark-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', transition: 'background 0.3s' }}>
          {questions.length == examData.targetQuestions ? <FiCheck size={20} /> : <FiClock size={20} />}
        </div>
      </div>

      {/* Question Builder */}
      <div className="card">
        <h3 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>➕ Add Questions</h3>
        
        {/* Question Type Selector */}
        <div className="question-type-selector">
          {['mcq', 'truefalse', 'text'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setCurrentQuestion(prev => ({ ...prev, type }))}
              className={`type-btn ${currentQuestion.type === type ? 'active' : ''}`}
            >
              {type === 'mcq' ? 'Multiple Choice' : 
               type === 'truefalse' ? 'True/False' : 'Text Answer'}
            </button>
          ))}
        </div>

        <div className="question-builder">
          {/* Question Text */}
          <div className="form-group">
            <label>Question *</label>
            <textarea
              value={currentQuestion.question}
              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Enter your question"
              className="input-field"
              rows="2"
            />
          </div>

          {/* Image Upload / URL */}
          <div className="form-group">
            <label>Question Image (Optional) - Upload or Paste URL</label>
            <div className="image-upload-container" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Paste image URL here..."
                value={typeof currentQuestion.image === 'string' && currentQuestion.image.startsWith('http') ? currentQuestion.image : ''}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, image: e.target.value }))}
                className="input-field"
                style={{ flex: 1, minWidth: '200px' }}
              />
              <span style={{ color: 'var(--dark-400)' }}>OR</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
                id="question-image"
              />
              <label htmlFor="question-image" className="upload-btn">
                <FiImage /> Upload Image
              </label>
              {currentQuestion.image && (
                <div className="image-preview">
                  <img src={currentQuestion.image} alt="Question" />
                  <button
                    type="button"
                    onClick={() => setCurrentQuestion(prev => ({ ...prev, image: null }))}
                    className="remove-image"
                  >
                    <FiX />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Options for MCQ */}
          {currentQuestion.type === 'mcq' && (
            <div className="form-group">
              <label>Options *</label>
              <div className="options-container">
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="option-row">
                    <span className="option-letter">{String.fromCharCode(65 + index)}.</span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      className="input-field"
                    />
                    <button
                      type="button"
                      onClick={() => setCurrentQuestion(prev => ({ 
                        ...prev, 
                        correctAnswer: index 
                      }))}
                      className={`correct-btn ${currentQuestion.correctAnswer === index ? 'active' : ''}`}
                    >
                      <FiCheck />
                    </button>
                  </div>
                ))}
              </div>
              <small style={{ color: 'var(--dark-400)', fontSize: '12px' }}>
                Click ✓ to mark as correct answer
              </small>
            </div>
          )}

          {/* True/False Options */}
          {currentQuestion.type === 'truefalse' && (
            <div className="form-group">
              <label>Correct Answer *</label>
              <div className="truefalse-container">
                {['true', 'false'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCurrentQuestion(prev => ({ 
                      ...prev, 
                      correctAnswer: value 
                    }))}
                    className={`tf-btn ${currentQuestion.correctAnswer === value ? 'active' : ''}`}
                  >
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Text Options */}
          {currentQuestion.type === 'text' && (
            <div className="form-group">
              <label>Expected Exact Answer *</label>
              <input
                type="text"
                value={currentQuestion.correctAnswer === 0 ? '' : currentQuestion.correctAnswer}
                onChange={(e) => setCurrentQuestion(prev => ({ 
                  ...prev, 
                  correctAnswer: e.target.value 
                }))}
                placeholder="Enter the exact correct answer text"
                className="input-field"
              />
              <small style={{ color: 'var(--dark-400)', fontSize: '12px' }}>
                Students must type this exact text to get marks
              </small>
            </div>
          )}

          {/* Marks */}
          <div className="form-group">
            <label>Marks for this question *</label>
            <input
              type="number"
              value={currentQuestion.marks}
              onChange={(e) => setCurrentQuestion(prev => ({ 
                ...prev, 
                marks: parseInt(e.target.value) || 1 
              }))}
              min="1"
              className="input-field"
              style={{ width: '120px' }}
            />
          </div>

          {/* Explanation */}
          <div className="form-group">
            <label>Explanation (Optional)</label>
            <textarea
              value={currentQuestion.explanation}
              onChange={(e) => setCurrentQuestion(prev => ({ 
                ...prev, 
                explanation: e.target.value 
              }))}
              placeholder="Add explanation for the correct answer"
              className="input-field"
              rows="2"
            />
          </div>

          <button
            type="button"
            onClick={addQuestion}
            className="btn-primary add-question-btn"
          >
            <FiPlus /> Add Question
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="card">
        <h3 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>
          📋 Questions List ({questions.length})
        </h3>
        <div className="questions-list">
          {questions.map((q, index) => (
            <div key={q.id} className="question-item">
              <div className="question-info">
                <span className="q-number">#{index + 1}</span>
                <span className="q-text">{q.question.substring(0, 60)}</span>
                <span className="q-type">{q.type}</span>
                <span className="q-marks">{q.marks} marks</span>
              </div>
              <div className="question-actions">
                <button
                  type="button"
                  onClick={() => duplicateQuestion(q.id)}
                  className="action-btn duplicate"
                  title="Duplicate"
                >
                  <FiCopy />
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="action-btn delete"
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
          {questions.length === 0 && (
            <div className="no-questions">
              <p>No questions added yet. Add your first question above.</p>
            </div>
          )}
        </div>
      </div>

      <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FiChevronLeft /> Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FiSend /> Create Exam
        </button>
      </div>
    </motion.div>
  )

  return (
    <div className="create-exam-container">
      <div className="welcome-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Create New Exam</h2>
            <p>Set up your examination with questions and settings</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--dark-400)', fontSize: '14px' }}>
              Step {step} of 2
            </span>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {step === 1 ? renderStep1() : renderStep2()}
    </div>
  )
}

export default CreateExam
