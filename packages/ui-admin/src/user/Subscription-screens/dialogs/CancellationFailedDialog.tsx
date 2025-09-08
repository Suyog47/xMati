import React from 'react'
import { Dialog, Button } from '@blueprintjs/core'

interface CancellationFailedDialogProps {
  isOpen: boolean
  message: string
  onClose: () => void
}

const CancellationFailedDialog: React.FC<CancellationFailedDialogProps> = ({ isOpen, message, onClose }) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Cancellation Failed"
      icon="error"
      canOutsideClickClose={true}
    >
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2 style={{ color: '#c23030', marginBottom: '10px' }}>Cancellation Failed</h2>
        <p style={{ fontSize: '1.1em', color: '#666' }}>
          Unfortunately, we could not cancel your subscription at this time.
        </p>
        <div style={{ marginTop: 10, color: '#c23030', fontWeight: 500, fontSize: 15 }}>
          {message || 'An unknown error occurred. Please try again later or contact support.'}
        </div>
        <Button
          intent="primary"
          onClick={onClose}
          style={{
            marginTop: '20px',
            padding: '14px 32px',
            fontSize: '1.05em',
            fontWeight: 'bold',
            minWidth: '250px',
            borderRadius: 6
          }}
        >
          Close
        </Button>
      </div>
    </Dialog>
  )
}

export default CancellationFailedDialog
