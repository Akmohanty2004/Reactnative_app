import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { FiSearch, FiUser, FiTrash2 } from 'react-icons/fi'
import { getUsers, deleteUser } from '../../redux/slices/adminSlice'

const AdminUsers = () => {
  const dispatch = useDispatch()
  const { users } = useSelector(state => state.admin)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    dispatch(getUsers())
  }, [dispatch])

  const handleDelete = (userId, userName) => {
    if (window.confirm(`Are you sure you want to permanently delete the user "${userName}"? This will also delete their exams and results.`)) {
      dispatch(deleteUser(userId))
    }
  }

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleBadge = (role) => {
    switch(role) {
      case 'admin': return 'badge-danger'
      case 'teacher': return 'badge-info'
      case 'student': return 'badge-success'
      default: return 'badge-secondary'
    }
  }

  return (
    <div>
      <div className="welcome-banner">
        <h2>User Management</h2>
        <p>Manage all users of the platform</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div className="input-group" style={{ maxWidth: '400px' }}>
          <FiSearch className="icon" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '48px' }}
          />
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(30, 41, 59, 0.5)' }}>
              <tr>
                <th style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--dark-400)', fontSize: '12px', textTransform: 'uppercase' }}>User</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--dark-400)', fontSize: '12px', textTransform: 'uppercase' }}>Email</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--dark-400)', fontSize: '12px', textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--dark-400)', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right', color: 'var(--dark-400)', fontSize: '12px', textTransform: 'uppercase' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={user._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary-500), var(--secondary-500))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '14px',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {user.profileImage ? (
                          <img 
                            src={user.profileImage.startsWith('http') || user.profileImage.startsWith('data:image') ? user.profileImage : `https://online-exam-platform-server-5onvzuva2-try-best.vercel.app/${user.profileImage.replace(/\\/g, '/').replace(/^\//, '')}`} 
                            alt={user.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                          />
                        ) : null}
                        <span style={{ display: user.profileImage ? 'none' : 'block' }}>
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '200px' }}>
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--dark-300)' }}>{user.email}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className={`badge ${getRoleBadge(user.role)}`}>{user.role}</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    {(() => {
                      const isOnline = user.lastLogin && new Date(user.lastLogin) >= new Date(Date.now() - 24 * 60 * 60 * 1000);
                      return (
                        <span className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`}>
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    {user.role !== 'admin' && (
                      <button 
                        className="btn-danger"
                        style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleDelete(user._id, user.name)}
                      >
                        <FiTrash2 /> Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--dark-400)' }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminUsers