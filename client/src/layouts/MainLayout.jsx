import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { 
  FiMenu, FiX, FiHome, FiBook, FiTrendingUp, FiUser, 
  FiBell, FiClipboard, FiLogOut, FiSettings, FiHelpCircle,
  FiUsers, FiPlus, FiCheck, FiMoon, FiSun
} from 'react-icons/fi'
import { logoutUser } from '../redux/slices/authSlice'
import { getNotifications, markAsRead, markAllAsRead } from '../redux/slices/notificationSlice'
const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [imageError, setImageError] = useState(false)
  
  const { user } = useSelector(state => state.auth)
  const { notifications, unreadCount } = useSelector(state => state.notifications || { notifications: [], unreadCount: 0 })
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const notifRef = React.useRef(null)

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Reset image error if user profile image changes (e.g. they uploaded a new one)
  useEffect(() => {
    setImageError(false)
  }, [user?.profileImage])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:image')) return path;
    const cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');
    return `https://online-exam-platform-server-5onvzuva2-try-best.vercel.app/${cleanPath}`;
  }

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setIsSidebarOpen(false)
      } else {
        setIsSidebarOpen(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    
    // Close dropdown on outside click
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    
    // Fetch notifications
    if (user) {
      dispatch(getNotifications())
    }
    
    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dispatch, user])


  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login', { replace: true })
  }

  const getNavItems = () => {
    if (user?.role === 'student') {
      return [
        { path: '/student/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/student/exams', label: 'My Exams', icon: FiBook },
        { path: '/student/results', label: 'Results', icon: FiTrendingUp },
        { path: '/student/profile', label: 'Profile', icon: FiUser },
      ]
    } else if (user?.role === 'teacher') {
      return [
        { path: '/teacher/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/teacher/exams', label: 'My Exams', icon: FiBook },
        { path: '/teacher/create-exam', label: 'Create Exam', icon: FiPlus },
        { path: '/teacher/results', label: 'Results', icon: FiTrendingUp },
        { path: '/teacher/profile', label: 'Profile', icon: FiUser },
      ]
    } else if (user?.role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: FiHome },
        { path: '/admin/users', label: 'Users', icon: FiUsers },
        { path: '/admin/exams', label: 'Exams', icon: FiBook },
        { path: '/admin/results', label: 'Results', icon: FiTrendingUp },
        { path: '/admin/profile', label: 'Profile', icon: FiUser },
      ]
    }
    return []
  }

  const navItems = getNavItems()
  const currentPage = navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'

  return (
    <div className="main-layout">
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <a href="#" className="brand">
            <div className="brand-icon">📚</div>
            {isSidebarOpen && <span className="brand-text">ExamHub</span>}
          </a>
          <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>

        <div className="sidebar-user">
          <div className="avatar">
            {user?.profileImage && !imageError ? (
              <img src={getImageUrl(user.profileImage)} alt={user.name} onError={() => setImageError(true)} />
            ) : (
              user?.name?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          {isSidebarOpen && (
            <div className="user-info">
              <div className="name">{user?.name}</div>
              <div className="role">{user?.role}</div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  navigate(item.path)
                  if (window.innerWidth <= 1024) setIsSidebarOpen(false)
                }}
              >
                <Icon />
                {isSidebarOpen && <span className="label">{item.label}</span>}
              </button>
            )
          })}
        </nav>

      </aside>

      {isSidebarOpen && isMobile && (
        <div className="sidebar-overlay show" onClick={() => setIsSidebarOpen(false)} />
      )}

      <main className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
        <header className="top-header">
          <div className="header-left">
            <button className="menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <FiMenu />
            </button>
            <h1>{currentPage}</h1>
          </div>
          <div className="header-right">
            <button className="notif-btn" onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? <FiMoon /> : <FiSun />}
            </button>
            <div className="notif-container" ref={notifRef} style={{ position: 'relative' }}>
              <button className="notif-btn" onClick={() => setIsNotifOpen(!isNotifOpen)}>
                <FiBell />
                {unreadCount > 0 && <span className="badge-dot" style={{ position: 'absolute', top: '0', right: '0', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%' }} />}
              </button>
              
              {isNotifOpen && (
                <div className="notif-dropdown" style={{
                  position: 'absolute', top: '100%', right: '0', marginTop: '10px',
                  width: '320px', background: 'var(--dark-800)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 9999,
                  maxHeight: '400px', overflowY: 'auto'
                }}>
                  <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', margin: 0, color: 'var(--text-main)' }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={() => dispatch(markAllAsRead())}
                        style={{ background: 'transparent', border: 'none', color: 'var(--primary-400)', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    {notifications.length > 0 ? notifications.map(notif => (
                      <div 
                        key={notif._id} 
                        style={{ 
                          padding: '12px 16px', 
                          display: 'flex', 
                          gap: '12px', 
                          background: notif.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                          borderLeft: notif.isRead ? '3px solid transparent' : '3px solid var(--primary-500)',
                          cursor: 'pointer'
                        }}
                        onClick={() => !notif.isRead && dispatch(markAsRead(notif._id))}
                      >
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '14px', margin: '0 0 4px 0', color: notif.isRead ? 'var(--dark-400)' : 'var(--text-main)' }}>{notif.title}</h4>
                          <p style={{ fontSize: '13px', margin: '0 0 6px 0', color: 'var(--dark-400)', lineHeight: '1.4' }}>{notif.message}</p>
                          <span style={{ fontSize: '11px', color: 'var(--dark-500)' }}>{new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        {!notif.isRead && (
                          <div style={{ color: 'var(--primary-400)', alignSelf: 'center' }}>
                            <FiCheck />
                          </div>
                        )}
                      </div>
                    )) : (
                      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--dark-400)', fontSize: '14px' }}>
                        No notifications yet
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="user-badge" style={{ cursor: 'pointer' }} onClick={() => navigate(`/${user?.role}/profile`)}>
              <div className="avatar-sm">
                {user?.profileImage && !imageError ? (
                  <img src={getImageUrl(user.profileImage)} alt={user.name} onError={() => setImageError(true)} />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <span className="role-text">{user?.role}</span>
            </div>
            <button 
              className="btn-logout" 
              onClick={handleLogout}
            >
              <FiLogOut /> Logout
            </button>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default MainLayout