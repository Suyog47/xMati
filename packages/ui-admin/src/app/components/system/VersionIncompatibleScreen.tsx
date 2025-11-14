import React from 'react'

interface VersionIncompatibleScreenProps {
  logo: string
  versionInfo: { server: string; client: string }
}

export const VersionIncompatibleScreen: React.FC<VersionIncompatibleScreenProps> = ({ logo, versionInfo }) => (
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
    <div style={{ fontSize: 28, fontWeight: 700, color: '#c53030', marginBottom: 16 }}>⚠️ Version Incompatible</div>
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
      <div style={{ marginBottom: 8 }}><strong>Server Version:</strong> {versionInfo.server}</div>
      <div><strong>Current Version:</strong> {versionInfo.client}</div>
    </div>
  </div>
)
