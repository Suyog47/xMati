import React from 'react'
import { Dialog, Button } from '@blueprintjs/core'

interface PaymentSuccessDialogProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => Promise<void>
}

const PaymentSuccessDialog: React.FC<PaymentSuccessDialogProps> = ({ isOpen, onClose, onLogout }) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={async () => {
        onClose()
        await onLogout()
      }}
      title="Payment Successful"
      icon="tick-circle"
      canOutsideClickClose={false}
    >
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2 style={{ color: '#4caf50', marginBottom: '10px' }}>Thank You!</h2>
        <p style={{ fontSize: '1.1em', color: '#666' }}>
          Your payment is successful...
        </p>
        <div style={{ marginTop: 10, color: '#106ba3', fontWeight: 500, fontSize: 15 }}>
          You now need to log out and will need to log in again.<br />
        </div>
        <div style={{ marginTop: 24, color: 'red', fontWeight: 600, fontSize: 17 }}>
          *DO NOT Refresh this page and logout is mandatory for full subscription activation*.
        </div>
        <Button
          intent="primary"
          onClick={async () => {
            onClose()
            await onLogout()
          }}
          style={{
            marginTop: '20px',
            padding: '14px 32px',
            fontSize: '1.05em',
            fontWeight: 'bold',
            minWidth: '250px',
            borderRadius: 6,
          }}
        >
          Logout
        </Button>
      </div>
    </Dialog>
  )
}

export default PaymentSuccessDialog
