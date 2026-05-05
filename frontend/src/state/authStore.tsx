import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '../api/auth'
import { getAuthToken, setAuthToken } from '../api/client'
import type { LoginRequest, RegisterRequest, User } from '../types/user'
import { errorMessage, isApiErrorWithStatus } from '../utils/errors'
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
} from './authContext'

/**
 * Storage key used for the bearer token. Persisting in `localStorage` is good
 * enough for an educational project — the backend already enforces auth on
 * every API call, so the frontend never trusts the cached user object alone.
 */
const TOKEN_STORAGE_KEY = 'clicky_store_auth_token'

function readStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredToken(token: string | null): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    if (token === null) {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {
    // localStorage may be disabled (e.g. private browsing) — fall through.
  }
}

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Use lazy initializers so we read localStorage exactly once on mount
  // without keeping a ref around (which would trip react-hooks/refs lint).
  const [token, setTokenState] = useState<string | null>(() => readStoredToken())
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    readStoredToken() ? 'loading' : 'unauthenticated',
  )

  // Keep the API client's in-memory token in sync with React state so any
  // component-issued fetch picks up the right Authorization header.
  useEffect(() => {
    setAuthToken(token)
  }, [token])

  const applySession = useCallback((nextToken: string, nextUser: User) => {
    writeStoredToken(nextToken)
    setAuthToken(nextToken)
    setTokenState(nextToken)
    setUser(nextUser)
    setStatus('authenticated')
  }, [])

  const clearSession = useCallback(() => {
    writeStoredToken(null)
    setAuthToken(null)
    setTokenState(null)
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  // On boot, if we found a stored token, validate it against /me. A 401 means
  // the token has expired; anything else (including network failure) leaves
  // the session as-is so the user can retry.
  useEffect(() => {
    const storedToken = readStoredToken()
    if (!storedToken) {
      return
    }
    let cancelled = false
    setAuthToken(storedToken)
    authApi
      .getCurrentUser()
      .then((current) => {
        if (cancelled) {
          return
        }
        setUser(current)
        setStatus('authenticated')
      })
      .catch((err) => {
        if (cancelled) {
          return
        }
        if (isApiErrorWithStatus(err, 401)) {
          clearSession()
          return
        }
        // Surface a sensible status without dropping the token; the user can
        // retry by refreshing or re-logging in.
        setStatus('unauthenticated')
        console.warn('Failed to refresh auth session:', errorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [clearSession])

  const login = useCallback(
    async (payload: LoginRequest) => {
      const response = await authApi.login(payload)
      applySession(response.token, response.user)
      return response.user
    },
    [applySession],
  )

  const register = useCallback(
    async (payload: RegisterRequest) => {
      const response = await authApi.register(payload)
      applySession(response.token, response.user)
      return response.user
    },
    [applySession],
  )

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  const refresh = useCallback(async () => {
    if (!getAuthToken()) {
      clearSession()
      return
    }
    try {
      const current = await authApi.getCurrentUser()
      setUser(current)
      setStatus('authenticated')
    } catch (err) {
      if (isApiErrorWithStatus(err, 401)) {
        clearSession()
        return
      }
      throw err
    }
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      token,
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      refresh,
    }),
    [status, user, token, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
