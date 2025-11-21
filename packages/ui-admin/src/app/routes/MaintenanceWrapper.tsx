import { auth } from 'botpress/shared'
import React, { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import api from '~/app/api'
import packageJson from '../../../../../package.json'
import logo from './xmati.png'

const CURRENT_VERSION = packageJson.version
// Base API URL (reintroduced for account status check)
const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

const MaintenanceWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isMaintenance, setIsMaintenance] = useState(() => {
    // Check localStorage on initial load for maintenance status
    const savedMaintenanceState = localStorage.getItem('maintenance')
    return savedMaintenanceState ? JSON.parse(savedMaintenanceState).status : false
  })

  const [isBlocked, setIsBlocked] = useState(() => {
    // Check localStorage on initial load for blocked status
    const savedBlockedState = localStorage.getItem('accountBlocked')
    return savedBlockedState ? JSON.parse(savedBlockedState).isBlocked : false
  })

  const [isVersionIncompatible, setIsVersionIncompatible] = useState(() => {
    // Check localStorage on initial load for version check
    const savedVersionState = localStorage.getItem('versionIncompatible')
    return savedVersionState ? JSON.parse(savedVersionState).isIncompatible : false
  })
  //  const [isVersionIncompatible, setIsVersionIncompatible] = useState(false)

  const [versionInfo, setVersionInfo] = useState(() => {
    // Restore version info from localStorage on initial load
    const savedVersionState = localStorage.getItem('versionIncompatible')
    if (savedVersionState) {
      const parsed = JSON.parse(savedVersionState)
      return parsed.versionInfo || { server: '', client: CURRENT_VERSION }
    }
    return { server: '', client: CURRENT_VERSION }
  })

  const location = useLocation()
  const didCheckAccountRef = useRef(false)
  // const excludedRouteRegex = /admin123/
  // const isExcludedRoute = excludedRouteRegex.test(location.pathname)

  //const formData = JSON.parse(localStorage.getItem('formData') || '{}')
  const subData = JSON.parse(localStorage.getItem('subData') || '{}')
  // const isAdminUser = formData.email === 'xmatiservice@gmail.com'

  // Function to compare semantic versions
  const compareVersions = (version1: string, version2: string): number => {
    const v1Parts = version1.split('.').map(Number) // server version
    const v2Parts = version2.split('.').map(Number) // current version

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0
      const v2Part = v2Parts[i] || 0

      if (v1Part > v2Part || v1Part < v2Part) {
        return -1
      }
    }
    return 0
  }

  const workspaceRouteRegex = /^\/(?:workspace|studio)/
  // Excluded routes: if location.pathname starts with one of these, skip the check.
  const excludedRoutes = [
    '/botCreation',
    '/botCreation/admin123',
    '/login',
    '/register',
    '/setToken',
    '/changePassword',
    '/noAccess',
    '/chatAuthResult'
  ]

  // WebSocket connection for real-time communication - keep alive regardless of which screen is shown
  useEffect(() => {
    const formData = JSON.parse(localStorage.getItem('formData') || '{}')
    if (!workspaceRouteRegex.test(location.pathname)) {
      return // Only connect if logged in
    }

    let socket: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isMounted = true

    const connectWebSocket = () => {
      if (!isMounted) {
        return
      }

      socket = new WebSocket('ws://localhost:8000')

      socket.onopen = () => {
        const userId = formData.email || 'child-ui-admin-anonymous'
        socket?.send(JSON.stringify({
          type: 'REGISTER_CHILD',
          userId,
          clientVersion: CURRENT_VERSION,
        }))

        // Immediately call /check-account-status after successful WebSocket connection
        if (!didCheckAccountRef.current) {
          didCheckAccountRef.current = true
          void (async () => {
            try {
              if (!formData.email) {
                return
              }
              const res = await fetch(`${API_URL}/check-account-status`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-App-Version': CURRENT_VERSION,
                },
                body: JSON.stringify({
                  email: formData.email,
                }),
              })

            } catch (err) {
              // Silently ignore errors; WebSocket remains available
            }
          })()

          // get the jwt token
          void (async () => {
            try {
              if (!formData.email) {
                return
              }
              const res = await fetch(`${API_URL}/get-jwt-token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-App-Version': CURRENT_VERSION,
                },
                body: JSON.stringify({
                  email: formData.email,
                }),
              })

              if (res.ok) {
                const data = await res.json()
                if (data && (data.token || Object.keys(data).length > 0)) {
                  sessionStorage.setItem('token', data.token)
                } else {
                  sessionStorage.setItem('token', '')
                }
              } else {
                // remove any previous token on error
                sessionStorage.removeItem('token')
              }
            } catch (err) {
              // Silently ignore errors; WebSocket remains available
            }
          })()

          // get the aes key
          void (async () => {
            try {
              if (!formData.email) {
                return
              }
              const res = await fetch(`${API_URL}/get-aes-key`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-App-Version': CURRENT_VERSION,
                },
                body: JSON.stringify({
                  email: formData.email,
                }),
              })

              if (res.ok) {
                const data = await res.json()
                if (data && (data.token || Object.keys(data).length > 0)) {
                  sessionStorage.setItem('aes-key', data.aesKey)
                } else {
                  sessionStorage.setItem('aes-key', '')
                }
              } else {
                // remove any previous token on error
                sessionStorage.removeItem('aes-key')
              }

            } catch (err) {
              // Silently ignore errors; WebSocket remains available
            }
          })()
        }
      }

      socket.onmessage = (event) => {
        if (!isMounted) {
          return
        }
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'FORCE_LOGOUT':
            handleLogout()
            break
          case 'BLOCK_STATUS':
            handleBlockStatus(data.message)
            break
          case 'VERSION_UPDATE':
            handleVersionUpdate(data.message)
            break
          case 'MAINTENANCE_STATUS':
            handleMaintenanceUpdate(data.message)
            break
          default:
            break
        }
      }

      socket.onclose = () => {
        if (!isMounted) {
          return
        }
        reconnectTimeout = setTimeout(connectWebSocket, 1000)
      }
    }

    connectWebSocket()

    return () => {
      isMounted = false
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      socket?.close()
    }
  }, [location.pathname])

  // Check localStorage fields continuously using listeners
  useEffect(() => {
    const safeParse = (raw) => {
      try {
        return JSON.parse(raw || '{}')
      } catch {
        return {}
      }
    }

    const doLogout = () => {
      handleLogout()        // your existing logout logic
    }

    const validate = () => {
      const currentPath = window.location.pathname

      // Skip on excluded routes (login, register, etc.)
      const skipCheck = excludedRoutes.some(route => currentPath.startsWith(route))
      if (skipCheck) {
        return
      }

      const formDataRaw = localStorage.getItem('formData')
      const subDataRaw = localStorage.getItem('subData')
      const tokenDataRaw = sessionStorage.getItem('token')
      const aesKeyRaw = sessionStorage.getItem('aes-key')

      const formData = safeParse(formDataRaw)
      const subData = safeParse(subDataRaw)

      const invalid =
        !formDataRaw ||
        !subDataRaw ||
        !tokenDataRaw ||
        !aesKeyRaw ||
        Object.keys(formData).length === 0 ||
        Object.keys(subData).length === 0 ||
        !formData.email

      if (invalid) {
        doLogout()
      }
    }

    const handleStorageChange = (event) => {
      const currentPath = window.location.pathname
      const skipCheck = excludedRoutes.some(route => currentPath.startsWith(route))
      if (skipCheck) {
        return
      }

      // If ALL of localStorage was cleared
      if (event.key === null) {
        doLogout()
        return
      }

      // If one of the critical keys changed
      if (event.key === 'formData' || event.key === 'subData' || event.key === 'token' || event.key === 'aes-key') {
        validate()
      }
    }

    // Run validation on mount and periodically (every 5 seconds)
    // validate()
    //const intervalId = setInterval(validate, 5000)

    // Listen for storage events
    window.addEventListener('storage', handleStorageChange)

    // cleanup
    return () => {
      // clearInterval(intervalId)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])   // ← Runs only once on mount

  // Set loading to false on component mount
  useEffect(() => {
    setIsLoading(false)
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    auth.logout(() => api.getSecured())
  }

  const handleBlockStatus = (status) => {
    setIsBlocked(status === 'Blocked' ? true : false)
    localStorage.setItem('accountBlocked', JSON.stringify({
      isBlocked: status === 'Blocked' ? true : false,
    }))
  }

  const handleVersionUpdate = (serverVersion: string) => {
    const currentProjectVersion = CURRENT_VERSION

    // If version comparison returns < 0, show incompatibility screen
    if (compareVersions(serverVersion, currentProjectVersion) < 0) {
      const versionData = { server: serverVersion, client: currentProjectVersion }
      setVersionInfo(versionData)
      setIsVersionIncompatible(true)

      // Save to localStorage to persist across page reloads
      localStorage.setItem('versionIncompatible', JSON.stringify({
        isIncompatible: true,
        versionInfo: versionData,
        timestamp: Date.now()
      }))
    } else {
      // If versions are compatible, clear any previous incompatibility state
      localStorage.removeItem('versionIncompatible')
      setIsVersionIncompatible(false)
    }
  }

  const handleMaintenanceUpdate = (status: boolean) => {
    setIsMaintenance(status)
    localStorage.setItem('maintenance', JSON.stringify({ status }))
  }


  if (isLoading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 20,
          color: '#444',
          fontWeight: 500,
        }}
      >
        Loading xMati...
      </div>
    )
  }

  if (isBlocked && workspaceRouteRegex.test(location.pathname)) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f8f0ff 0%, #e0b3ff 100%)',
          textAlign: 'center',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <img
          src={logo}
          alt='xMati Logo'
          style={{ width: 120, height: 'auto', marginBottom: 32, userSelect: 'none' }}
          draggable={false}
        />
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#7c3aed',
            marginBottom: 16,
          }}
        >
          🚫 Account Blocked
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: '#2d3748',
            width: '80%',
            maxWidth: 600,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          Your account has been temporarily blocked due to security or policy violations.
        </div>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
            fontSize: 16,
            color: '#4a5568',
            maxWidth: 500,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            Please contact support for assistance or wait for the block to be lifted.
          </div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>
            If you believe this is an error, please reach out to our support team.
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 600,
            color: '#fff',
            backgroundColor: '#7c3aed',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#6d28d9'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#7c3aed'
          }}
        >
          Logout
        </button>
      </div>
    )
  }

  if (isVersionIncompatible && workspaceRouteRegex.test(location.pathname)) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)',
          textAlign: 'center',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <img
          src={logo}
          alt='xMati Logo'
          style={{ width: 120, height: 'auto', marginBottom: 32, userSelect: 'none' }}
          draggable={false}
        />
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#c53030',
            marginBottom: 16,
          }}
        >
          ⚠️ Version Incompatible
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: '#2d3748',
            width: '80%',
            maxWidth: 600,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          Your current frontend version is incompatible with the server version.
        </div>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
            fontSize: 16,
            color: '#4a5568',
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <strong>Server Version:</strong> {versionInfo.server}
          </div>
          <div>
            <strong>Current Version:</strong> {versionInfo.client}
          </div>
        </div>
      </div>
    )
  }

  if (subData.subsChanged && workspaceRouteRegex.test(location.pathname)) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: 20,
          color: '#444',
          fontWeight: 500,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            fontSize: 23,
            fontWeight: 600,
            color: '#102a43',
            width: '80%',
            maxWidth: 500,
            lineHeight: 1.6,
            wordSpacing: '2px',
            marginBottom: 24,
          }}
        >
          You have recently updated your subscription details on your current account. Please log out and log back in to apply the changes and continue using the platform.
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 600,
            color: '#fff',
            backgroundColor: '#007bff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    )
  }

  if (isMaintenance && workspaceRouteRegex.test(location.pathname)) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)',
          textAlign: 'center',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        <img
          src={logo}
          alt='xMati Logo'
          style={{ width: 120, height: 'auto', marginBottom: 24, userSelect: 'none' }}
          draggable={false}
        />
        <div
          style={{
            fontSize: 23,
            fontWeight: 600,
            color: '#102a43',
            width: '80%',
            maxWidth: 500,
            lineHeight: 1.6,
            wordSpacing: '2px',
          }}
        >
          The xMati platform is currently in Maintenance mode.
          <br />
          Please check back later.
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default MaintenanceWrapper
