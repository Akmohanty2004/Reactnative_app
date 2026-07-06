import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { 
  FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, 
  FiEdit, FiSave, FiCamera, FiAward, FiBook, 
  FiTrendingUp, FiCheckCircle, FiX, FiUsers
} from 'react-icons/fi'
import { updateProfile, uploadProfileImage, getCurrentUser, changePassword } from '../../redux/slices/authSlice'
import toast from '../../utils/toast'

const TeacherProfile = () => {
  const { user } = useSelector(state => state.auth)
  const dispatch = useDispatch()
  const fileInputRef = useRef(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    department: '',
    address: '',
    college: '',
    age: '',
    gender: ''
  })
  const [profileImage, setProfileImage] = useState(null)
    const [previewImage, setPreviewImage] = useState(null)
  
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('New passwords do not match')
    }
    try {
      await dispatch(changePassword({ 
        oldPassword: passwordData.oldPassword, 
        newPassword: passwordData.newPassword 
      })).unwrap()
      setShowPasswordForm(false)
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      // Error handled in slice
    }
  }

  useEffect(() => {
    dispatch(getCurrentUser())
  }, [dispatch])

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        department: user.department || '',
        address: user.address || '',
        college: user.college || '',
        age: user.age || '',
        gender: user.gender || ''
      })
      setProfileImage(user.profileImage || null)
    }
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB')
      return
    }

    setIsUploading(true)
    
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreviewImage(event.target.result)
    }
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append('profileImage', file)
    
    try {
      const result = await dispatch(uploadProfileImage(formData)).unwrap()
      
      const imageUrl = result.imageUrl || result.user?.profileImage
      if (imageUrl) {
        setProfileImage(imageUrl)
        setPreviewImage(null)
        setImageError(false)
        
        const userData = JSON.parse(localStorage.getItem('user') || '{}')
        userData.profileImage = imageUrl
        localStorage.setItem('user', JSON.stringify(userData))
        await dispatch(getCurrentUser())
      }
    } catch (error) {
      toast.error(error || 'Failed to upload image')
      setPreviewImage(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      const result = await dispatch(updateProfile(formData)).unwrap()
      setIsEditing(false)
      
      const userData = JSON.parse(localStorage.getItem('user') || '{}')
      Object.assign(userData, formData)
      localStorage.setItem('user', JSON.stringify(userData))
      await dispatch(getCurrentUser())
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        department: user.department || '',
        address: user.address || '',
        college: user.college || '',
        age: user.age || '',
        gender: user.gender || ''
      })
    }
  }

  const getInitials = () => {
    if (!user?.name) return 'T'
    return user.name.charAt(0).toUpperCase()
  }

  // Teacher stats from real data
  const stats = [
    { label: 'Total Exams', value: user?.totalExams || 0, icon: FiBook, color: '#6366f1' },
    { label: 'Students', value: user?.totalStudents || 0, icon: FiUsers, color: '#10b981' },
    { label: 'Avg Score', value: user?.avgScore ? `${user.avgScore}%` : '0%', icon: FiTrendingUp, color: '#8b5cf6' },
    { label: 'Rating', value: user?.rating || '0', icon: FiAward, color: '#f59e0b' }
  ]

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:image')) return path;
    const cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');
    return `https://online-exam-platform-server-5onvzuva2-try-best.vercel.app/${cleanPath}`;
  }

  return (
    <div className="profile-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-img">
            {previewImage ? (
              <img src={previewImage} alt="Preview" />
            ) : profileImage ? (
              <img src={getImageUrl(profileImage)} alt={user?.name} />
            ) : (
              getInitials()
            )}
          </div>
          <div 
            className="avatar-upload"
            onClick={() => fileInputRef.current?.click()}
            style={{ opacity: isUploading ? 0.5 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}
          >
            <FiCamera />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
            />
          </div>
          {isUploading && (
            <div style={{ fontSize: '12px', color: 'var(--dark-400)', marginTop: '4px', textAlign: 'center' }}>
              Uploading...
            </div>
          )}
        </div>
        
        <div className="profile-info">
          <h2>{user?.name || 'Teacher'}</h2>
          <span className="role-badge teacher">Teacher</span>
          <div className="profile-meta">
            <span><FiMail /> {user?.email || 'N/A'}</span>
            <span><FiPhone /> {user?.phone || 'N/A'}</span>
            <span><FiMapPin /> {user?.department || 'N/A'}</span>
            <span><FiCalendar /> Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
        
        <div className="profile-actions">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="btn-primary" style={{ width: '100%' }}>
                <FiSave /> Save
              </button>
              <button onClick={handleCancel} className="btn-secondary" style={{ width: '100%' }}>
                <FiX /> Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn-primary" style={{ width: '100%' }}>
              <FiEdit /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="profile-stats">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div className="stat-item" key={index}>
              <div style={{ 
                display: 'inline-flex',
                padding: '10px',
                borderRadius: '12px',
                background: `${stat.color}20`,
                marginBottom: '8px'
              }}>
                <Icon style={{ color: stat.color, fontSize: '22px' }} />
              </div>
              <div className="value">{stat.value}</div>
              <div className="label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Profile Form */}
      <div className="profile-form">
        <h3>Profile Information</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="input-field"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="input-field"
              style={{ opacity: 0.6 }}
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="input-field"
              placeholder="Enter phone number"
            />
          </div>
          <div className="form-group">
            <label>Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="input-field"
              placeholder="Enter department"
            />
          </div>
          <div className="form-group">
            <label>College</label>
            <input
              type="text"
              name="college"
              value={formData.college}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="input-field"
              placeholder="Enter college name"
            />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="input-field"
              placeholder="Enter age"
              min="1"
              max="100"
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="input-field"
              style={{ appearance: 'auto' }}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group full-width">
            <label>Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="input-field"
              placeholder="Enter your address"
            />
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="profile-security">
        <h3>Security</h3>
        <div className="security-item" style={{ display: 'block' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showPasswordForm ? '16px' : '0' }}>
            <div className="info">
              <span className="title">Change Password</span>
              <span className="desc">Update your account password for better security</span>
            </div>
            <button 
              className="btn-secondary" 
              style={{ padding: '8px 24px' }}
              onClick={() => setShowPasswordForm(!showPasswordForm)}
            >
              {showPasswordForm ? 'Cancel' : 'Change'}
            </button>
          </div>
          
          {showPasswordForm && (
            <form onSubmit={handlePasswordSubmit} style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
              <div className="form-group">
                <label>Old Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  required 
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  required 
                  minLength={6}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  required 
                  minLength={6}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default TeacherProfile
