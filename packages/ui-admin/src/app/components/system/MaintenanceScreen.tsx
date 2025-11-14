import React from 'react'

interface MaintenanceScreenProps {
  logo: string
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ logo }) => (
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
