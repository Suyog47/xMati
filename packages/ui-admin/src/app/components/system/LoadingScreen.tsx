import React from 'react'

interface LoadingScreenProps {
  message?: string
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading xMati...' }) => (
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
    {message}
  </div>
)
