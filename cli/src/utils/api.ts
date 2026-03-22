import axios, { AxiosInstance } from 'axios'
import { getToken, getConfig } from './config'

export async function createApiClient(): Promise<AxiosInstance> {
  const token = await getToken()
  const config = await getConfig()

  if (!token) {
    throw new Error('Not authenticated. Please run `ceylon login` first.')
  }

  const client = axios.create({
    baseURL: config.apiUrl,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        throw new Error('Authentication expired. Please run `ceylon login` again.')
      }
      throw error
    }
  )

  return client
}

export async function checkAuth(): Promise<boolean> {
  const token = await getToken()
  return !!token
}
