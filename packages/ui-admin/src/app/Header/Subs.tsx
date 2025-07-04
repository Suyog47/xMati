import { Button, Tooltip, Dialog } from '@blueprintjs/core'
import React, { useState } from 'react'

function formatDate(dateStr: string) {
  if (!dateStr || dateStr === '-') {
    return '-'
  }
  const date = new Date(dateStr)
  return isNaN(date.getTime())
    ? dateStr
    : date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
}

// import and formatDate function stays same

export const Subs = () => {
  const [isDialogOpen, setDialogOpen] = useState(false)
  const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')

  const {
    subscription = '',
    createdAt = '-',
    till = '-',
    daysRemaining = '-',
    amount = '-',
    duration = '-',
    expired = false,
  } = savedSubData

  const days = typeof daysRemaining === 'string' ? parseInt(daysRemaining, 10) : daysRemaining

  return (
    <div id="subscription_dropdown">
      <Tooltip content="View Subscription" position="bottom">
        <Button
          minimal
          intent="primary"
          onClick={() => setDialogOpen(true)}
          style={{ fontSize: 15, textDecoration: 'underline', color: 'white' }}
        >
          <strong>{subscription}</strong>
        </Button>
      </Tooltip>

      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Your Subscription Details"
        icon="credit-card"
        canOutsideClickClose
        canEscapeKeyClose
        style={{
          width: '90%',
          maxWidth: 700,
          maxHeight: '97vh',
          minHeight: 400,
          overflow: 'auto',
        }}
      >
        <div style={{ padding: '10px 28px' }}>
          {/* Header */}
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'black',
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            {subscription ? `${subscription}` : 'No Active Plan'}
          </h2>

          {/* Two Columns with Divider */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'flex-start',
            }}
          >
            {/* Left - Plan Features */}
            <div style={{ flex: '1 1 250px', minWidth: 200 }}>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#106ba3',
                  marginBottom: 10,
                  borderBottom: '2px solid #2196f3',
                  paddingBottom: 4,
                  width: 'fit-content',
                }}
              >
                Plan Features
              </h3>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 16,
                  color: '#106ba3',
                  backgroundColor: '#e3e3e3',
                  padding: '6px 14px',              // Internal padding
                  borderRadius: '10px',
                  display: 'inline-block',          // Shrink to fit content
                  marginBottom: 10,
                  marginTop: 10,
                }}
              >
                {(subscription === 'Trial' || subscription.toLowerCase() === 'starter')
                  ? '3 bots included'
                  : subscription.toLowerCase() === 'professional'
                    ? '5 bots included'
                    : '-'}
              </div>

              <div style={{ fontWeight: 600, color: '#394B59', marginBottom: 8 }}>Includes:</div>
              <ul style={{ paddingLeft: 16, marginBottom: 24 }}>
                {['LLM Support', 'HITL (Human in the Loop)', 'Bot Analytics'].map((item, idx) => (
                  <li key={idx} style={{ marginBottom: 6, color: '#106ba3' }}>✓ {item}</li>
                ))}
              </ul>

              <div style={{ fontWeight: 600, color: '#394B59', marginBottom: 8 }}>
                Supported Channels:
              </div>
              <ul style={{ paddingLeft: 16 }}>
                {['Web Channel', 'Telegram', 'Slack', 'Facebook Messenger'].map((ch, idx) => (
                  <li key={idx} style={{ marginBottom: 6, color: '#106ba3' }}>✓ {ch}</li>
                ))}
              </ul>
            </div>

            {/* Vertical Divider */}
            <div
              style={{
                width: 1.2,
                background: 'grey',
                height: '100%',
                minHeight: 300,
              }}
              className="divider-desktop"
            />


            {/* Right - Subscription Details */}
            <div style={{ flex: '1 1 250px', minWidth: 200 }}>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#106ba3',
                  marginBottom: 20,
                  borderBottom: '2px solid #2196f3',
                  paddingBottom: 4,
                  width: 'fit-content',
                }}
              >
                Subscription Details
              </h3>

              {[
                ['Start Date', formatDate(createdAt)],
                ['End Date', formatDate(till)],
                ['Amount Paid', amount === '0' ? '-' : amount],
                ['Duration', duration === '15d' ? '15 Days' : duration === '3d' ? '3 Days' : duration],
              ].map(([label, value], idx, arr) => (
                <React.Fragment key={idx}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 15,
                      color: '#394B59',
                      marginBottom: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontWeight: 600, flex: '1 1 45%' }}>{label}:</span>
                    <span
                      style={{
                        fontWeight: 500,
                        flex: '1 1 45%',
                        textAlign: 'right',
                        color: '#182026',
                      }}
                    >
                      {value}
                    </span>
                  </div>

                  {/* Divider (skip after last item) */}
                  {idx < arr.length - 1 && (
                    <div
                      style={{
                        height: 1.5,
                        background: '#E1E8ED',
                        margin: '8px 0 16px',
                        width: '100%',
                      }}
                    />
                  )}
                </React.Fragment>
              ))}

            </div>
          </div>

          {/* Plan Expiry Message */}
          <div
            style={{
              marginTop: 10,
              textAlign: 'center',
              fontWeight: 700,
              color: '#106BA3',
              fontSize: 18,
            }}
          >
            {days === 0
              ? 'Your plan will expire today.'
              : days !== '-' && days > 0
                ? `Your plan expires in ${days} day${days > 1 ? 's' : ''}`
                : 'Your plan has expired.'}
          </div>

          <hr
            style={{
              border: 'none',
              borderTop: '2px solid #E1E8ED',
              margin: '10px 0 16px',
            }}
          />

          {/* Footer Buttons */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 40,
              marginTop: 16,
            }}
          >
            {/* {subscription !== 'Trial' && !expired && (
              <Button
                intent="danger"
                large
                style={{
                  minWidth: 280,
                  height: 52,
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
                onClick={() => alert('Work in progress')}
              >
                Cancel Your Subscription
              </Button>
            )} */}
            <Button
              intent="primary"
              large
              style={{
                minWidth: 280,
                height: 52,
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 8,
              }}
              onClick={() => setDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

