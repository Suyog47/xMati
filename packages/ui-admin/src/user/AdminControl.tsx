import React, { FC, useState } from 'react'
import { Dialog, Button, FormGroup, Spinner } from '@blueprintjs/core'
import api from '~/app/api'
import ms from 'ms'


interface Props {
  isOpen: boolean
  toggle: () => void
}

const AdminControl: FC<Props> = ({ isOpen, toggle }) => {
  const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
  const [isBackupLoading, setBackupLoading] = useState(false)
  const [isRetrievalLoading, setRetrievalLoading] = useState(false)
  const [isDialogLoading, setDialogLoading] = useState(false) // Full dialog loader state

  const handleBackup = async () => {
    setDialogLoading(true) // Show full dialog loader
    try {
      const ids = savedFormData.botIdList
      console.log('Bot IDs for backup:', ids)
      await api.getSecured({ timeout: ms('8m') }).post('/admin/workspace/bots/saveAllBots', { ids })
      alert('Backup to S3 completed successfully!')
    } catch (error) {
      console.error('Error during backup:', error)
      alert('Failed to backup to S3.')
    } finally {
      setDialogLoading(false) // Hide full dialog loader
    }
  }

  const handleRetrieval = async () => {
    setDialogLoading(true) // Show full dialog loader
    try {
      await api.getSecured({ timeout: ms('8m') }).post('/admin/workspace/bots/getAllBots')
      alert('Retrieval from S3 completed successfully!')
    } catch (error) {
      console.error('Error during retrieval:', error)
      alert('Failed to retrieve from S3.')
    } finally {
      setDialogLoading(false) // Hide full dialog loader
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={toggle}
      title="Admin Control"
      canOutsideClickClose={false} // Disable outside click
    >
      {/* Full dialog loader overlay */}
      {isDialogLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Spinner size={50} />
        </div>
      )}

      <div
        className="bp4-dialog-body"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }}>
          <FormGroup label="Bot Backup to S3">
            <Button
              intent="primary"
              onClick={handleBackup}
              disabled={isDialogLoading} // Disable button when dialog loader is active
              style={{ width: '150px' }} // Increased button width
            >
              Backup
            </Button>
          </FormGroup>
        </div>
        <div style={{ width: '1px', backgroundColor: '#ccc', margin: '0 16px' }} /> {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <FormGroup label="Bot Retrieval from S3">
            <Button
              intent="success"
              onClick={handleRetrieval}
              disabled={isDialogLoading} // Disable button when dialog loader is active
              style={{ width: '150px' }} // Increased button width
            >
              Retrieve
            </Button>
          </FormGroup>
        </div>
      </div>
    </Dialog>
  )
}

export default AdminControl
