import React from 'react'
import { Dialog, Button } from '@blueprintjs/core'

interface PaymentFailedDialogProps {
  isOpen: boolean
  message: string
  onClose: () => void
}

const PaymentFailedDialog: React.FC<PaymentFailedDialogProps> = ({ isOpen, message, onClose }) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Payment Failed"
      icon="error"
      canOutsideClickClose={true}
    >
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2 style={{ color: '#c23030', marginBottom: '10px' }}>Payment Failed</h2>
        <p style={{ fontSize: '1.1em', color: '#666' }}>
          Unfortunately, your payment could not be processed.
        </p>
        <div style={{ marginTop: 10, color: '#c23030', fontWeight: 500, fontSize: 15 }}>
          {message || 'An unknown error occurred. Please try again later.'}
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

export default PaymentFailedDialog
