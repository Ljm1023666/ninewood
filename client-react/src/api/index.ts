import axios from 'axios'
import { getApiBaseURL } from '@/config/runtime-origin'
import { getAuthToken, setAuthToken } from './auth-session'

export { setAuthToken }

const api = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 15000,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let redirecting = false

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url ?? ''
      const isAuthRoute = /\/auth\//.test(url)
      if (!isAuthRoute) {
        setAuthToken(null)
        if (!redirecting) {
          redirecting = true
          window.location.replace('/login')
        }
      }
    }
    return Promise.reject(err)
  },
)

export default api
