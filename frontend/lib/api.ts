import axios from 'axios'
import { createClient } from './supabase/client'

const supabase = createClient()

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch (error) {
    console.warn('Failed to fetch Supabase session in interceptor:', error)
  }
  return config
})
