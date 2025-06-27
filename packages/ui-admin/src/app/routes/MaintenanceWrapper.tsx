import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import logo from './xmati.png' // Make sure this path is correct

const MaintenanceWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isMaintenance, setIsMaintenance] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const response = await fetch('http://localhost:8000/get-maintenance', {
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
  const isAdminUser = formData.email === 'admin@gmail.com'

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

  if (isMaintenance && !isExcludedRoute) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%)', // subtle background gradient
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
            maxWidth: 500, // keeps it from stretching too far on large screens
            lineHeight: 1.6,         // Line spacing
            wordSpacing: '2px',      // Word spacing
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
