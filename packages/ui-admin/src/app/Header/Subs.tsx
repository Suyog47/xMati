import { Button, Tooltip, Dialog } from '@blueprintjs/core'
import React, { useState } from 'react'

// Helper function to format ISO date strings
function formatDate(dateStr: string) {
  if (!dateStr || dateStr === '-') {
    return '-'
  }
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return dateStr
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const dialogStyles = {
  contentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '15px',
    color: '#394B59',
  },
  label: {
    fontWeight: 600,
    color: '#5C7080',
  },
  value: {
    fontWeight: 500,
    color: '#182026',
  },
  centerText: {
    marginTop: '24px',
    textAlign: 'center' as const,
    fontWeight: 600,
    color: '#106BA3',
    fontSize: '17px',
  },
  dialogBody: {
    padding: '24px 32px',
  },
  subscriptionHeader: {
    fontSize: '22px',
    fontWeight: 700,
    color: 'black',
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px 32px 24px',
  },
  divider: {
    border: 'none',
    borderTop: '2px solid #E1E8ED',
    margin: '8px 0 16px 0',
    height: 0,
    width: '100%',
  }
}

export const Subs = () => {
  const [isDialogOpen, setDialogOpen] = useState(false)
  const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')

  const {
    subscription = 'No Plan',
    createdAt = '-',
    till = '-',
    daysRemaining = '-',
    amount = '-',
    duration = '-'
  } = savedSubData

  // Parse daysRemaining as a number for comparison
  const days = typeof daysRemaining === 'string' ? parseInt(daysRemaining, 10) : daysRemaining

  return (
    <div id="subscription_dropdown">
      <Tooltip content="View Subscription" position="bottom">
        <Button minimal intent="primary" onClick={() => setDialogOpen(true)}>
          <strong style={{ color: 'white', fontSize: '15px', textDecoration: 'underline' }}>{subscription}</strong>
        </Button>
      </Tooltip>

      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Your Subscription Details"
        canOutsideClickClose
        canEscapeKeyClose
      >
        <div style={dialogStyles.dialogBody}>
          <div style={dialogStyles.subscriptionHeader}>{subscription}</div>

          <div style={dialogStyles.contentRow}>
            <span style={dialogStyles.label}>Started From:</span>
            <span style={dialogStyles.value}>{formatDate(createdAt)}</span>
          </div>
          <hr style={dialogStyles.divider} />
          <div style={dialogStyles.contentRow}>
            <span style={dialogStyles.label}>Expiry:</span>
            <span style={dialogStyles.value}>{formatDate(till)}</span>
          </div>
          <hr style={dialogStyles.divider} />
          <div style={dialogStyles.contentRow}>
            <span style={dialogStyles.label}>Amount Paid:</span>
            <span style={dialogStyles.value}>{amount === 0 || amount === '0' ? '-' : amount}</span>
          </div>
          <hr style={dialogStyles.divider} />
          <div style={dialogStyles.contentRow}>
            <span style={dialogStyles.label}>Duration:</span>
            <span style={dialogStyles.value}>
              {duration === '15d' ? '15 Days' : duration}
            </span>
          </div>
          <br />
          <div style={dialogStyles.centerText}>
            {days === 0
              ? 'You plan will be expired today.'
              : days !== '-' && days > 0
                ? `Your plan expires in ${days} day${days > 1 ? 's' : ''}`
                : 'Your plan has been expired.'}
          </div>
        </div>

        <div style={dialogStyles.footer}>
          <Button onClick={() => setDialogOpen(false)} intent="primary">
            Close
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
