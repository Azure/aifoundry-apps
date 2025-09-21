import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function AuthCallback() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setAuth } = useAuth()

  const lastCodeRef = useRef<string | null>(null)
  const errorTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setError(null)

    const handleCallback = async () => {
      // Read directly from the current URL to avoid dependency churn
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const oauthError = params.get('error')

      if (oauthError) {
        if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current)
        errorTimerRef.current = window.setTimeout(() => {
          setError(`Authentication failed: ${oauthError}`)
          setLoading(false)
        }, 3000)
        return
      }

      // If no code, show error and stop
      if (!code) {
        setError('No authorization code received')
        setLoading(false)
        return
      }

      // Guard against duplicate processing of the same code (e.g., React StrictMode)
      if (lastCodeRef.current === code) {
        return
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/github/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        })

        if (!response.ok) {
          throw new Error('Failed to authenticate')
        }

  const data = await response.json()

        // Update global auth state immediately so UI reflects login without extra click
        setAuth(data.access_token, data.user)
  // Mark code as processed only after success
  lastCodeRef.current = code

        navigate('/dashboard', { replace: true })
      } catch (err: unknown) {
        if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current)
        errorTimerRef.current = window.setTimeout(() => {
          setError('Authentication failed. Please try again.')
        }, 3000)
        console.error('Auth callback error:', err)
      } finally {
        setLoading(false)
      }
    }

    handleCallback()

    return () => {
      if (errorTimerRef.current) window.clearTimeout(errorTimerRef.current)
    }
  }, [navigate, setAuth])

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="text-white">Authenticating...</div>
    </div>
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="text-red-500">{error}</div>
    </div>
  }

  return null
}
