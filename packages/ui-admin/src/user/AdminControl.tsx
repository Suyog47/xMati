import React, { FC, useState } from 'react'
import { Dialog, Button, FormGroup, Spinner, Card, Elevation } from '@blueprintjs/core'
import api from '~/app/api'
import ms from 'ms'

interface Props {
  isOpen: boolean
  toggle: () => void
}

const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

const AdminControl: FC<Props> = ({ isOpen, toggle }) => {
  const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
  const maintenanceStatus = JSON.parse(localStorage.getItem('maintenance') || '{}')
  const [isDialogLoading, setDialogLoading] = useState(false)
  const [isMaintenanceActive, setMaintenanceActive] = useState(maintenanceStatus.status)

  const toggleMaintenance = () => setMaintenanceActive(prev => !prev)

  const handleBackup = async () => {
    setDialogLoading(true)
    try {
      const ids = savedFormData.botIdList
      await api.getSecured({ timeout: ms('8m') }).post('/admin/workspace/bots/saveAllBots', { ids })
      alert('Backup to S3 completed successfully!')
    } catch (error) {
      console.error('Error during backup:', error)
      alert('Failed to backup to S3.')
    } finally {
      setDialogLoading(false)
    }
  }

  const handleRetrieval = async () => {
    setDialogLoading(true)
    try {
      await api.getSecured({ timeout: ms('8m') }).post('/admin/workspace/bots/getAllBots')
      alert('Retrieval from S3 completed successfully!')
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('Error during retrieval:', error)
      alert('Failed to retrieve from S3.')
    } finally {
      setDialogLoading(false)
    }
  }

  const handleMaintenance = async () => {
    setDialogLoading(true)
    try {
      const response = await fetch(`${API_URL}/set-maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: !isMaintenanceActive }),
      })
      const result = await response.json()
      if (result.status) {
        toggleMaintenance()
        alert(`${result.msg}, ${!result.data ? 'active' : 'inactive'}`)
        localStorage.setItem('maintenance', JSON.stringify({ status: !isMaintenanceActive }))
      } else {
        alert(`Failed to toggle maintenance mode: ${result.msg}`)
      }
    } finally {
      setDialogLoading(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={toggle}
      title="Admin Control Panel"
      canOutsideClickClose={false}
      style={{
        width: '98vw',
        maxWidth: '100vw',
        height: '95vh', // Adjust height to fit content
        maxHeight: '97vh',
        padding: 0,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
      }}
    >
      {isDialogLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Spinner size={50} />
        </div>
      )}

      <div style={{ display: 'flex', height: '100%' }}>
        {/* Left Panel - Admin Actions */}
        <div
          style={{
            width: '30%',
            padding: '24px',
            paddingTop: 0,
            borderRight: '1px solid #eee',
            background: '#f9f9f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <h2 style={{ fontSize: '22px', marginBottom: '8px', fontWeight: 600 }}>Actions</h2>

          {/* Backup */}
          <Card elevation={Elevation.TWO}
            style={{
              padding: '20px',
              paddingTop: '5px',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
            <h4 style={{ marginBottom: '12px' }}>Backup Bots to S3</h4>
            <Button
              large
              fill
              icon="cloud-upload"
              intent="primary"
              onClick={handleBackup}
              disabled={isDialogLoading}
              style={{
                height: '52px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '8px',
              }}
            >
              Backup All Bots
            </Button>
          </Card>

          {/* Retrieve */}
          <Card elevation={Elevation.TWO}
            style={{
              padding: '20px',
              paddingTop: '5px',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
            <h4 style={{ marginBottom: '12px' }}>Restore Bots from S3</h4>
            <Button
              large
              fill
              icon="cloud-download"
              intent="success"
              onClick={handleRetrieval}
              disabled={isDialogLoading}
              style={{
                height: '52px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '8px',
              }}
            >
              Retrieve Bots
            </Button>
          </Card>

          {/* Maintenance */}
          <Card elevation={Elevation.TWO}
            style={{
              padding: '20px',
              paddingTop: '5px',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
            <h4 style={{ marginBottom: '12px' }}>Toggle Maintenance Mode</h4>
            <Button
              large
              fill
              icon="wrench"
              intent="warning"
              onClick={handleMaintenance}
              disabled={isDialogLoading}
              style={{
                height: '52px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '8px',
              }}
            >
              {isMaintenanceActive ? 'Disable Maintenance' : 'Enable Maintenance'}
            </Button>

            <div
              style={{
                marginTop: '12px',
                textAlign: 'center',
                fontWeight: 500,
                color: isMaintenanceActive ? 'green' : 'red',
              }}
            >
              Status: {isMaintenanceActive ? 'Active' : 'Inactive'}
            </div>
          </Card>
        </div>


        {/* Right Panel - User Data */}
        <div
          style={{
            flex: 1,
            padding: '32px',
            paddingTop: 10,
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'space-between', gap: '16px', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginTop: 0 }}>
              User Management
            </h2>
            <Button
              icon="user"
              large
              intent="primary"
              style={{
                height: '40px',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: '8px',
                padding: '0 24px',
                alignSelf: 'flex-start',
              }}
              onClick={() => alert('Fetching user list...')}
            >
              Load All Users
            </Button>
          </div>

          {/* Sample user card */}
          <Card
            interactive
            elevation={Elevation.TWO}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderRadius: '8px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '16px' }}>John Doe</div>
              <div style={{ color: '#5C7080' }}>john.doe@example.com</div>
            </div>
            <Button small icon="more" minimal />
          </Card>
        </div>

      </div>
    </Dialog>
  )
}

export default AdminControl
