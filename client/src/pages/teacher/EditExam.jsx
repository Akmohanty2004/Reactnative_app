import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { 
  FiSave, FiX, FiPlus, FiTrash2, FiImage,
  FiCheck, FiClock, FiCalendar, FiLock
} from 'react-icons/fi'
import { getExamById, updateExam } from '../../redux/slices/examSlice'
import toast from '../../utils/toast'

const EditExam = () => {
  const { examId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { currentExam, isLoading } = useSelector(state => state.exams)
  
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    marks: 1,
    image: null
  })

  const { register, handleSubmit, setValue, formState: { errors } } = useForm()
  const [examData, setExamData] = useState({
    title: '',
    subject: '',
    description: '',
    instructions: '',
    password: '',
    date: '',
    startTime: '',
    endTime: '',
    duration: 60,
    maxMarks: 100,
    passingMarks: 40,
    negativeMarking: false,
    negativeMarkValue: 0.25,
    randomQuestions: false,
    fullscreenMode: true,
    enableCamera: true,
    enableMicrophone: true,
    maxAttempts: 1
  })

  useEffect(() => {
    dispatch(getExamById(examId))
  }, [dispatch, examId])

  useEffect(() => {
    if (currentExam) {
      setExamData({
        title: currentExam.title || '',
        subject: currentExam.subject || '',
        description: currentExam.description || '',
        instructions: currentExam.instructions || '',
        password: currentExam.password || '',
        date: currentExam.date ? new Date(currentExam.date).toISOString().split('T')[0] : '',
        startTime: currentExam.startTime || '',
        endTime: currentExam.endTime || '',
        duration: currentExam.duration || 60,
        maxMarks: currentExam.maxMarks || 100,
        passingMarks: currentExam.passingMarks || 40,
        negativeMarking: currentExam.negativeMarking || false,
        negativeMarkValue: currentExam.negativeMarkValue || 0.25,
        randomQuestions: currentExam.randomQuestions || false,
        fullscreenMode: currentExam.fullscreenMode !== undefined ? currentExam.fullscreenMode : true,
        enableCamera: currentExam.enableCamera !== undefined ? currentExam.enableCamera : true,
        enableMicrophone: currentExam.enableMicrophone !== undefined ? currentExam.enableMicrophone : true,
        maxAttempts: currentExam.maxAttempts || 1
      })
      
      // Load questions if available
      if (currentExam.questions) {
        setQuestions(currentExam.questions.map(q => ({
          ...q,
          id: q._id || Date.now() + Math.random()
        })))
      }
    }
  }, [currentExam])

  const handleExamDataChange = (e) => {
    const { name, value, type, checked } = e.target
    setExamData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const addQuestion = () => {
    if (!currentQuestion.question.trim()) {
      toast.error('Please enter a question')
      return
    }
    if (currentQuestion.type === 'mcq' && currentQuestion.options.some(opt => !opt.trim())) {
      toast.error('Please fill all options')
      return
    }
    setQuestions([...questions, { ...currentQuestion, id: Date.now() }])
    setCurrentQuestion({
      type: 'mcq',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      marks: 1,
      image: null
    })
    toast.success('Question added successfully')
  }

  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options]
    newOptions[index] = value
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setCurrentQuestion(prev => ({ ...prev, image: event.target.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    
    if (questions.length === 0) {
      toast.error('Please add at least one question')
      return
    }

    const examPayload = {
      ...examData,
      questions: questions.map(q => ({
        type: q.type,
        question: q.question,
        options: q.options.map(opt => ({ text: opt })),
        correctAnswer: q.options[q.correctAnswer],
        marks: q.marks,
        image: q.image
      }))
    }

    try {
      await dispatch(updateExam({ examId, examData: examPayload }))
      navigate('/teacher/exams')
    } catch (error) {
      toast.error('Failed to update exam')
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="welcome-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Edit Exam</h2>
            <p>Update your examination details</p>
          </div>
          <button onClick={() => navigate('/teacher/exams')} className="btn-secondary">
            <FiX /> Cancel
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        {/* Exam Details */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>Exam Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                Exam Title *
              </label>
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
            <div>
              <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                Subject *
              </label>
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
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                Description
              </label>
              <textarea
                name="description"
                value={examData.description}
                onChange={handleExamDataChange}
                placeholder="Enter exam description"
                className="input-field"
                rows="3"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                Instructions
              </label>
              <textarea
                name="instructions"
                value={examData.instructions}
                onChange={handleExamDataChange}
                placeholder="Enter exam instructions"
                className="input-field"
                rows="3"
              />
            </div>
          </div>
        </div>

        {/* Exam Settings */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>Exam Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                Exam Password *
              </label>
              <input
                type="password"
                name="password"
                value={examData.password}
                onChange={handleExamDataChange}
                placeholder="Set exam password"
                className="input-field"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={examData.date}
                onChange={handleExamDataChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                Start Time *
              </label>
              <input
                type="time"
                name="startTime"
                value={examData.startTime}
                onChange={handleExamDataChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                End Time *
              </label>
              <input
                type="time"
                name="endTime"
                value={examData.endTime}
                onChange={handleExamDataChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                Duration (minutes) *
              </label>
              <input
                type="number"
                name="duration"
                value={examData.duration}
                onChange={handleExamDataChange}
                min="1"
                className="input-field"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                Max Marks *
              </label>
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
            <div>
              <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                Passing Marks *
              </label>
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
            <div>
              <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                Max Attempts
              </label>
              <input
                type="number"
                name="maxAttempts"
                value={examData.maxAttempts}
                onChange={handleExamDataChange}
                min="1"
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>Advanced Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--dark-300)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="negativeMarking"
                checked={examData.negativeMarking}
                onChange={handleExamDataChange}
              />
              Enable Negative Marking
            </label>
            {examData.negativeMarking && (
              <div>
                <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                  Negative Mark Value
                </label>
                <input
                  type="number"
                  name="negativeMarkValue"
                  value={examData.negativeMarkValue}
                  onChange={handleExamDataChange}
                  step="0.01"
                  min="0"
                  className="input-field"
                />
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--dark-300)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="randomQuestions"
                checked={examData.randomQuestions}
                onChange={handleExamDataChange}
              />
              Randomize Questions
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--dark-300)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="fullscreenMode"
                checked={examData.fullscreenMode}
                onChange={handleExamDataChange}
              />
              Force Fullscreen Mode
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--dark-300)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="enableCamera"
                checked={examData.enableCamera}
                onChange={handleExamDataChange}
              />
              Enable Camera Monitoring
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--dark-300)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="enableMicrophone"
                checked={examData.enableMicrophone}
                onChange={handleExamDataChange}
              />
              Enable Microphone Monitoring
            </label>
          </div>
        </div>

        {/* Questions */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '16px' }}>
            Questions ({questions.length})
          </h3>

          {/* Question Builder */}
          <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {['mcq', 'truefalse', 'text'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCurrentQuestion(prev => ({ ...prev, type }))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: currentQuestion.type === type ? 'var(--primary-500)' : 'var(--dark-700)',
                    color: currentQuestion.type === type ? 'white' : 'var(--dark-400)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    fontSize: '13px',
                    fontWeight: 500
                  }}
                >
                  {type === 'mcq' ? 'Multiple Choice' : type === 'truefalse' ? 'True/False' : 'Text Answer'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                  Question *
                </label>
                <textarea
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="Enter your question"
                  className="input-field"
                  rows="2"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                  Question Image (Optional)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    id="question-image-edit"
                  />
                  <label
                    htmlFor="question-image-edit"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: 'var(--dark-700)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <FiImage /> Upload Image
                  </label>
                  {currentQuestion.image && (
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={currentQuestion.image} 
                        alt="Question"
                        style={{ height: '50px', width: '50px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setCurrentQuestion(prev => ({ ...prev, image: null }))}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          background: 'var(--danger)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-main)',
                          cursor: 'pointer'
                        }}
                      >
                        <FiX style={{ fontSize: '12px' }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Options for MCQ */}
              {currentQuestion.type === 'mcq' && (
                <div>
                  <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                    Options *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--dark-400)', fontWeight: 600, width: '24px' }}>
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          className="input-field"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => setCurrentQuestion(prev => ({ ...prev, correctAnswer: index }))}
                          style={{
                            padding: '8px',
                            borderRadius: '8px',
                            border: 'none',
                            background: currentQuestion.correctAnswer === index ? 'var(--success)' : 'var(--dark-700)',
                            color: currentQuestion.correctAnswer === index ? 'white' : 'var(--dark-400)',
                            cursor: 'pointer'
                          }}
                        >
                          <FiCheck />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--dark-400)', marginTop: '4px' }}>
                    Click ✓ to mark as correct answer
                  </p>
                </div>
              )}

              {/* True/False Options */}
              {currentQuestion.type === 'truefalse' && (
                <div>
                  <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                    Correct Answer *
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['true', 'false'].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCurrentQuestion(prev => ({ ...prev, correctAnswer: value }))}
                        style={{
                          padding: '8px 20px',
                          borderRadius: '8px',
                          border: 'none',
                          background: currentQuestion.correctAnswer === value ? 'var(--primary-500)' : 'var(--dark-700)',
                          color: currentQuestion.correctAnswer === value ? 'white' : 'var(--dark-400)',
                          cursor: 'pointer',
                          textTransform: 'capitalize'
                        }}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Marks */}
              <div>
                <label style={{ display: 'block', color: 'var(--dark-300)', marginBottom: '6px', fontSize: '14px' }}>
                  Marks *
                </label>
                <input
                  type="number"
                  value={currentQuestion.marks}
                  onChange={(e) => setCurrentQuestion(prev => ({ ...prev, marks: parseInt(e.target.value) || 1 }))}
                  min="1"
                  className="input-field"
                  style={{ width: '120px' }}
                />
              </div>

              <button
                type="button"
                onClick={addQuestion}
                className="btn-primary"
                style={{ alignSelf: 'flex-start' }}
              >
                <FiPlus /> Add Question
              </button>
            </div>
          </div>

          {/* Question List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {questions.map((q, index) => (
              <div
                key={q.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(51,65,85,0.3)',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--primary-400)', fontWeight: 600 }}>#{index + 1}</span>
                    <span style={{ color: 'var(--text-main)' }}>{q.question.substring(0, 50)}{q.question.length > 50 ? '...' : ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '13px', color: 'var(--dark-400)' }}>
                    <span>{q.type}</span>
                    <span>{q.marks} marks</span>
                    {q.type === 'mcq' && (
                      <span>Correct: {String.fromCharCode(65 + q.correctAnswer)}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(239,68,68,0.2)',
                    color: 'var(--danger)',
                    cursor: 'pointer'
                  }}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
            {questions.length === 0 && (
              <p style={{ color: 'var(--dark-400)', textAlign: 'center', padding: '20px' }}>
                No questions added yet
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={() => navigate('/teacher/exams')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={questions.length === 0}
          >
            <FiSave /> Update Exam
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditExam
