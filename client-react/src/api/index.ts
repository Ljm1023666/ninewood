import axios from 'axios'

const baseURL =
  location.protocol === 'file:' ? 'http://localhost:3001/api' : '/api'

const api = axios.create({
  baseURL,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let redirecting = false

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      if (!redirecting) {
        redirecting = true
        window.location.replace('/login')
      }
    }
    return Promise.reject(err)
  },
)

export default api
