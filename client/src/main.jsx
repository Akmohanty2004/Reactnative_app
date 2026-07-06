import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider, useDispatch } from 'react-redux'
import { store } from './redux/store'
import App from './App'
import { getCurrentUser } from './redux/slices/authSlice'
import './styles/index.css'
import './styles/auth.css'
import './styles/dashboard.css'
import './styles/sidebar.css'
import './styles/exam.css'
import './styles/profile.css'
import './styles/responsive.css'
import axios from 'axios'

// Set global base URL for production backend
axios.defaults.baseURL = 'https://online-exam-platform-server-5onvzuva2-try-best.vercel.app'

// Component to load user data on app start
const AppWithAuth = () => {
  const dispatch = useDispatch()
  
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      dispatch(getCurrentUser()).unwrap().catch(() => {
        // If token is invalid, clear it
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      })
    }
  }, [dispatch])
  
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <AppWithAuth />
    </Provider>
  </React.StrictMode>,
)