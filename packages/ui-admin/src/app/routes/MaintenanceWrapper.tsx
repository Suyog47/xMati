import { auth } from 'botpress/shared'
import React, { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import api from '~/app/api'
import packageJson from '../../../../../package.json'
import logo from './xmati.png'

const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'
const CURRENT_VERSION = packageJson.version

const MaintenanceWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isMaintenance, setIsMaintenance] = useState(true)
  const [isVersionIncompatible, setIsVersionIncompatible] = useState(() => {
    // Check localStorage on initial load
    const savedVersionState = localStorage.getItem('versionIncompatible')
    return savedVersionState ? JSON.parse(savedVersionState).isIncompatible : false
  })
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
  const versionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastVersionCheckRef = useRef<number>(0)
  //const isLoggedOutRef = useRef(false)

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

  // Function to check version from server
  const checkServerVersion = async () => {
    try {
      // Prevent multiple simultaneous calls (debounce with 5 seconds)
      const currentTime = Date.now()
      if (currentTime - lastVersionCheckRef.current < 5000) {
        return
      }
      lastVersionCheckRef.current = currentTime

      const response = await fetch(`${API_URL}/get-versions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.success && data.data && data.data['child-node']) {
        const serverVersion = data.data['child-node'] // Version from server response
        const currentProjectVersion = CURRENT_VERSION // Version from package.json (0.0.1)

        // Log version check for debugging (remove in production)
        // console.log('Version Check:', {
        //   serverChildNodeVersion: serverVersion,
        //   currentProjectVersion,
        //   comparison: compareVersions(serverVersion, currentProjectVersion)
        // })

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
    } catch (error) {
      console.error('Error checking server version:', error)
    }
  }

  // Recursive function to schedule next version check
  const scheduleVersionCheck = () => {
    if (versionCheckTimeoutRef.current) {
      clearTimeout(versionCheckTimeoutRef.current)
    }

    versionCheckTimeoutRef.current = setTimeout(() => {
      void checkServerVersion()
      scheduleVersionCheck() // Recursive call
    }, 10000) // Check every 10 seconds (faster detection)
  }

  // Enhanced API interceptor for version checking
  useEffect(() => {
    // const originalFetch = window.fetch

    // window.fetch = async (...args) => {
    //   try {
    //     const response = await originalFetch(...args)

    //     // Check if this is an API call to our backend
    //     const url = args[0] as string
    //     if (typeof url === 'string' && url.includes(API_URL)) {
    //       // Schedule version check after any API response (success or failure)
    //       setTimeout(() => void checkServerVersion(), 1000) // Delay to avoid overwhelming the server
    //     }

    //     return response
    //   } catch (error) {
    //     // Even on API failure, check version
    //     const url = args[0] as string
    //     if (typeof url === 'string' && url.includes(API_URL)) {
    //       setTimeout(() => void checkServerVersion(), 1000)
    //     }
    //     throw error
    //   }
    // }

    // Start the recursive version checking
    scheduleVersionCheck()

    // // Cleanup function
    // return () => {
    //   window.fetch = originalFetch
    //   if (versionCheckTimeoutRef.current) {
    //     clearTimeout(versionCheckTimeoutRef.current)
    //   }
    // }
  }, [])

  // Check for stale version incompatibility state (optional: auto-clear after some time)
  useEffect(() => {
    if (isVersionIncompatible) {
      const savedVersionState = localStorage.getItem('versionIncompatible')
      if (savedVersionState) {
        const parsed = JSON.parse(savedVersionState)
        const timestamp = parsed.timestamp || 0
        const now = Date.now()

        // Optional: Auto-clear incompatibility state after 30 minutes
        if (now - timestamp > 30 * 60 * 1000) {
          localStorage.removeItem('versionIncompatible')
          setIsVersionIncompatible(false)
        }
      }
    }
  }, [isVersionIncompatible])

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/get-maintenance`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        const data = await response.json()
        setIsMaintenance(data.data) // Set the maintenance status
        localStorage.setItem('maintenance', JSON.stringify({ status: data.data })) // Store the status in localStorage
      } catch (error) {
        console.error('Error fetching maintenance status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void checkMaintenanceStatus()
  }, [])

  const excludedRouteRegex = /admin123/
  const isExcludedRoute = excludedRouteRegex.test(location.pathname)

  const formData = JSON.parse(localStorage.getItem('formData') || '{}')
  const subData = JSON.parse(localStorage.getItem('subData') || '{}')
  const isAdminUser = formData.email === 'xmatiservice@gmail.com'

  const handleLogout = () => {
    localStorage.clear()
    auth.logout(() => api.getSecured())
  }

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

  // Check localStorage fields every 2 seconds and logout if any is empty (unless on an excluded route)
  useEffect(() => {
    const tokenCheckInterval = setInterval(() => {
      // Skip check if current pathname starts with any excluded route
      const skipCheck = excludedRoutes.some(route => location.pathname.startsWith(route))
      if (skipCheck) {
        return
      }

      const formDataRaw = localStorage.getItem('formData')
      const subDataRaw = localStorage.getItem('subData')
      if (!formDataRaw || formDataRaw === '{}' || !subDataRaw || subDataRaw === '{}') {
        handleLogout()
      }
    }, 2000)
    return () => clearInterval(tokenCheckInterval)
  }, [location.pathname])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (versionCheckTimeoutRef.current) {
        clearTimeout(versionCheckTimeoutRef.current)
      }
    }
  }, [])

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

  if (isVersionIncompatible) {
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

  if (subData.subsChanged) {
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

  if (isMaintenance && !isExcludedRoute && !isAdminUser) {
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
