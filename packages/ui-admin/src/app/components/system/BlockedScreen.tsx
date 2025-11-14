import React from 'react'

interface BlockedScreenProps {
  onLogout: () => void
  logo: string
}

export const BlockedScreen: React.FC<BlockedScreenProps> = ({ onLogout, logo }) => (
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
    <div style={{ fontSize: 28, fontWeight: 700, color: '#7c3aed', marginBottom: 16 }}>🚫 Account Blocked</div>
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
      <div style={{ marginBottom: 12 }}>Please contact support for assistance or wait for the block to be lifted.</div>
      <div style={{ fontSize: 14, color: '#6b7280' }}>If you believe this is an error, please reach out to our support team.</div>
    </div>
    <button
      onClick={onLogout}
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
