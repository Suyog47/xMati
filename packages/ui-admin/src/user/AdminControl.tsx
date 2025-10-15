import { Dialog, Button, FormGroup, Spinner, Card, Elevation } from '@blueprintjs/core'
import { toast } from 'botpress/shared'
import ms from 'ms'
import React, { FC, useEffect, useState } from 'react'
import api from '~/app/api'
import EnquiryDialog from './EnquiryDialog'
import UserCard from './UserCard'

interface Props {
  isOpen: boolean
  toggle: () => void
}

interface UserData {
  email: string
  [key: string]: any // Add more fields as needed
}

const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

const AdminControl: FC<Props> = ({ isOpen, toggle }) => {
  const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
  const token = JSON.parse(localStorage.getItem('token') || '{}')
  const maintenanceStatus = JSON.parse(localStorage.getItem('maintenance') || '{}')
  const [isDialogLoading, setDialogLoading] = useState(false)
  const [isMaintenanceActive, setMaintenanceActive] = useState(maintenanceStatus.status)
  const [userList, setUserList] = useState<UserData[]>([])
  const [isEnquiryDialogOpen, setEnquiryDialogOpen] = useState(false)
  const toggleMaintenance = () => setMaintenanceActive(prev => !prev)
  const toggleEnquiryDialog = () => setEnquiryDialogOpen(prev => !prev)

  const getAllUsers = async () => {
    setDialogLoading(true)
    try {
      const response = await fetch(`${API_URL}/get-all-users-subscriptions`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      })
      const result = await response.json()

      if (result.success) {
        setUserList(result.data)
      } else {
        toast.failure(`Failed to fetch user list: ${result.message}`)
      }
    } catch (error) {
      toast.failure('Failed to fetch user list.')
    } finally {
      setDialogLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      void getAllUsers()
    }
  }, [isOpen])


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
        height: '93vh',
        maxHeight: '93vh',
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

      <div style={{ display: 'flex', height: '95%' }}>
        {/* Left Panel - Admin Actions */}
        <div
          style={{
            width: '30%',
            padding: '20px',
            paddingTop: 0,
            borderRight: '1px solid #eee',
            background: '#f9f9f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
            maxHeight: '100%',
          }}
        >
          <h2 style={{ fontSize: '20px', marginBottom: '6px', fontWeight: 600, marginTop: '10px' }}>Actions</h2>

          {/* Backup */}
          <Card elevation={Elevation.TWO}
            style={{
              padding: '16px',
              paddingTop: '8px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
            <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Backup Bots to S3</h4>
            <Button
              fill
              icon="cloud-upload"
              intent="primary"
              onClick={handleBackup}
              disabled={isDialogLoading}
              style={{
                height: '40px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '6px',
              }}
            >
              Backup All Bots
            </Button>
          </Card>

          {/* Retrieve */}
          <Card elevation={Elevation.TWO}
            style={{
              padding: '16px',
              paddingTop: '8px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
            <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Restore Bots from S3</h4>
            <Button
              fill
              icon="cloud-download"
              intent="success"
              onClick={handleRetrieval}
              disabled={isDialogLoading}
              style={{
                height: '40px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '6px',
              }}
            >
              Retrieve Bots
            </Button>
          </Card>

          {/* Maintenance */}
          <Card elevation={Elevation.TWO}
            style={{
              padding: '16px',
              paddingTop: '8px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
            <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Toggle Maintenance Mode</h4>
            <Button
              fill
              icon="wrench"
              intent="warning"
              onClick={handleMaintenance}
              disabled={isDialogLoading}
              style={{
                height: '40px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '6px',
              }}
            >
              {isMaintenanceActive ? 'Disable Maintenance' : 'Enable Maintenance'}
            </Button>

            <div
              style={{
                marginTop: '8px',
                textAlign: 'center',
                fontWeight: 500,
                fontSize: '12px',
                color: isMaintenanceActive ? 'green' : 'red',
              }}
            >
              Status: {isMaintenanceActive ? 'Active' : 'Inactive'}
            </div>
          </Card>

          {/* Check Queries */}
          <Card elevation={Elevation.TWO}
            style={{
              padding: '16px',
              paddingTop: '8px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
            <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>View User Enquiries</h4>
            <Button
              fill
              icon="chat"
              intent="primary"
              onClick={toggleEnquiryDialog}
              disabled={isDialogLoading}
              style={{
                height: '40px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '6px',
              }}
            >
              Check Enquiries
            </Button>
          </Card>
        </div>


        {/* Right Panel - User List */}
        <div
          style={{
            flex: 1,
            padding: '32px',
            paddingTop: 10,
            backgroundColor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginTop: 0 }}>
              User Management
            </h2>
            <Button
              icon="refresh"
              large
              intent="primary"
              style={{
                height: '40px',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: '8px',
                padding: '0 24px'
              }}
              onClick={() => getAllUsers()}
            />
          </div>

          {/* Scrollable User List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {userList.map((u, idx) => (
              <UserCard
                key={idx}
                email={u.email}
                userData={u.userData}
                subscriptionData={u.subscriptionData}
                botsData={u.botsData}
              />
            ))}
          </div>
        </div>

      </div>

      {/* Enquiries Dialog */}
      <EnquiryDialog
        isOpen={isEnquiryDialogOpen}
        onClose={toggleEnquiryDialog}
      />
    </Dialog>
  )
}

export default AdminControl


