import { auth } from 'botpress/shared'
import React, { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import api from '~/app/api'
import packageJson from '../../../../../package.json'
import logo from './xmati.png' // Make sure this path is correct

const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'
const CURRENT_VERSION = packageJson.version

const MaintenanceWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isMaintenance, setIsMaintenance] = useState(true)
  const location = useLocation()
  const versionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastVersionCheckRef = useRef<number>(0)
  //const isLoggedOutRef = useRef(false)

  // Function to compare semantic versions
  const compareVersions = (version1: string, version2: string): number => {
    const v1Parts = version1.split('.').map(Number)
    const v2Parts = version2.split('.').map(Number)

    console.log(v1Parts, v2Parts)
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0
      const v2Part = v2Parts[i] || 0

      if (v1Part > v2Part) {
        return 1
      }
      if (v1Part < v2Part) {
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

        // If server's child-node version is less than current project version, show alert
        if (compareVersions(serverVersion, currentProjectVersion) < 0) {
          alert(`⚠️ Version Mismatch Warning!\n\nServer Child-Node Version: ${serverVersion}\nCurrent Project Version: ${currentProjectVersion}\n\nThe server's child-node version (${serverVersion}) is older than your current project version (${currentProjectVersion}). Some features may not work as expected.`)
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
