import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
})

export function errorMessage(error) {
  return error.response?.data?.detail || error.message || 'Unable to reach the analytics service.'
}

export default api
