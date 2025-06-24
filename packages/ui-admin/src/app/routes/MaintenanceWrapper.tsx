import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const MaintenanceWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isMaintenance, setIsMaintenance] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        // Call the get-maintenance API
        const response = await fetch('https://www.app.xmati.ai/apis/get-maintenance', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        const data = await response.json()
        setIsMaintenance(data.data) // Set the maintenance status
        localStorage.setItem('maintenance', JSON.stringify({ status: data.data })) // Store the status in localStorage
      } catch (error) {
        console.error('Error fetching maintenance status:', error)
      } finally {
        setIsLoading(false) // Stop loading
      }
    }

    void checkMaintenanceStatus()
  }, [])

  // Exclude the '/login/admin123/:strategy?/:workspace?' route from maintenance
  const excludedRouteRegex = /admin123/ // Regex to match the route
  const isExcludedRoute = excludedRouteRegex.test(location.pathname)

  // Check if formData.email is 'admin@123'
  const formData = JSON.parse(localStorage.getItem('formData') || '{}')
  const isAdminUser = formData.email === 'admin@gmail.com'

  if (isLoading) {
    return <div>Loading xMati...</div> // Show a loading indicator while the API call is in progress
  }

  if (isMaintenance && !isExcludedRoute && !isAdminUser) {
    // Render the maintenance mode screen
    return (
      <div
        style={{
          backgroundColor: 'white',
          color: 'black',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
        }}
      >
        The xMati is in Maintenance mode
      </div>
    )
  }

  // Render the rest of the app if not in maintenance mode
  return <>{children}</>
}

export default MaintenanceWrapper
