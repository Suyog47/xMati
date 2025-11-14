import React from 'react'

interface SubscriptionChangedScreenProps {
  onLogout: () => void
}

export const SubscriptionChangedScreen: React.FC<SubscriptionChangedScreenProps> = ({ onLogout }) => (
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
      onClick={onLogout}
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
