import { Button, Tooltip, Dialog, Tag } from '@blueprintjs/core'
import { UNDERLINE } from '@blueprintjs/icons/lib/esm/generated/iconContents'
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

export const Subs = () => {
  const [isDialogOpen, setDialogOpen] = useState(false)
  const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')
  const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
  const {
    subscription = '',
    createdAt = '-',
    till = '-',
    daysRemaining = '-',
    amount = '-',
    duration = '-',
    isCancelled = false,
    expired = false,
  } = savedSubData

  const days =
    typeof daysRemaining === 'string'
      ? parseInt(daysRemaining, 10)
      : daysRemaining

  // Returns a status badge with a color according to the subscription state.
  const renderStatusBadge = () => {
    if (isCancelled) {
      return <Tag intent="danger" round>Cancelled</Tag>
    } else if (days !== '-' && days < 5 && days >= 0) {
      return <Tag intent="warning" round>Expiring Soon</Tag>
    } else if (expired) {
      return <Tag intent="danger" round>Expired</Tag>
    } else {
      return <Tag intent="success" round>Active</Tag>
    }
  }

  // A colored alert banner to catch the user's attention regarding the subscription status.
  const renderAlertBanner = () => {
    if ((isCancelled || expired) && days >= 0) {
      return (
        <div
          style={{
            background: '#ffcccc',
            padding: '12px 20px',
            borderRadius: '4px',
            marginTop: 10,
            marginBottom: 5,
            textAlign: 'center',
            fontWeight: 700,
            color: '#721c24',
          }}
        >
          Your subscription has been cancelled.
        </div>
      )
    } else if (days !== '-' && days < 5 && days >= 0) {
      return (
        <div
          style={{
            background: '#fff3cd',
            padding: '12px 20px',
            borderRadius: '4px',
            marginTop: 10,
            marginBottom: 5,
            textAlign: 'center',
            fontWeight: 700,
            color: '#856404',
          }}
        >
          {days === 0 ? 'Your subscription expires today.' : `Your subscription expires in ${days} day${(days > 1) ? 's' : ''}.`}
        </div>
      )
    } else if (days !== '-' && days < 0) {
      return (
        <div
          style={{
            background: '#fff3cd',
            padding: '12px 20px',
            borderRadius: '4px',
            marginTop: 10,
            marginBottom: 5,
            textAlign: 'center',
            fontWeight: 700,
            color: '#856404',
          }}
        >
          Your subscription has been expired.
        </div>
      )
    } else {
      return (
        <div
          style={{
            background: '#d4edda',
            padding: '12px 20px',
            borderRadius: '4px',
            marginBottom: 20,
            textAlign: 'center',
            fontWeight: 700,
            color: '#155724',
          }}
        >
          Your subscription is active.
        </div>
      )
    }
  }

  return (
    <div id="subscription_dropdown">
      <Tooltip content="View Subscription" position="left">
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
          height: 'auto',
          maxHeight: '97vh',
          overflow: 'visible',
        }}
      >
        <div style={{ padding: '10px 18px' }}>

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
            {subscription ? subscription : 'No Active Plan'}
          </h2>

          {/* Status Badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            {renderStatusBadge()}
          </div>

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
                  padding: '6px 14px',
                  borderRadius: '10px',
                  display: 'inline-block',
                  marginBottom: 10,
                  marginTop: 10,
                }}
              >
                {subscription.toLowerCase() === 'starter'
                  ? '3 bots included'
                  : '5 bots included'}
              </div>

              <div style={{ fontWeight: 600, color: '#394B59', marginBottom: 8 }}>Includes:</div>
              <ul style={{ paddingLeft: 16, marginBottom: 24 }}>
                {['LLM Support', 'HITL (Human in the Loop)', 'Bot Analytics'].map((item, idx) => (
                  <li key={idx} style={{ marginBottom: 6, color: '#106ba3' }}>
                    ✓ {item}
                  </li>
                ))}
              </ul>

              <div style={{ fontWeight: 600, color: '#394B59', marginBottom: 8 }}>
                Supported Channels:
              </div>
              <ul style={{ paddingLeft: 16 }}>
                {['Whatsapp', 'Web Channel', 'Telegram', 'Slack', 'Facebook Messenger'].map((ch, idx) => (
                  (savedSubData.subscription === 'Starter' && ch === 'Whatsapp') ? null : (
                    <li key={idx} style={{ marginBottom: 6, color: '#106ba3' }}>
                      ✓ {ch}
                    </li>
                  )
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
                ['Duration', duration === '15d' ? '15 Days' : duration === '5d' ? '5 Days' : duration],
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

          {/* Plan Expiry Message
          <div
            style={{
              marginTop: 8,
              textAlign: 'center',
              fontWeight: 700,
              color: '#106BA3',
              fontSize: 18,
              textDecoration: 'underline'
            }}
          >
            {days === 0
              ? 'Your plan will expire today.'
              : days !== '-' && days > 0
                ? `Your plan expires in ${days} day${days > 1 ? 's' : ''}`
                : 'Your plan has been expired.'}
          </div> */}

          {/* Trial Plan Notification */}
          {!savedSubData.expired && savedFormData.nextSubs && (
            <div
              style={{
                marginBottom: 5,
                padding: '12px 16px',
                background: '#f3f4f6',
                borderRadius: 8,
                fontSize: 14,
                color: '#394B59',
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              {subscription === 'Trial' ? (
                <span>
                  You opted for <strong><u>{savedFormData.nextSubs.plan}</u></strong> plan on a <strong><u>{savedFormData.nextSubs.duration}</u></strong> basis after Trial, which you can change anytime.
                </span>
              ) : (
                <span>
                  You have downgraded your plan to <strong><u>{savedFormData.nextSubs.plan}</u></strong> for the <strong><u>{savedFormData.nextSubs.duration}</u></strong> duration.
                </span>
              )}
            </div>
          )}


          {/* Render the subscription status banner */}
          {renderAlertBanner()}

          {/* Footer Buttons */}
          {/* <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 40,
              marginTop: 16,
            }}
          >
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
          </div> */}
        </div>
      </Dialog>
    </div>
  )
}

