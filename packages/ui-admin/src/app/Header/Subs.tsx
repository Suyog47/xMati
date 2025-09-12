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
          maxHeight: '95vh',
          overflow: 'visible',
        }}
      >
        <div style={{ padding: '5px 18px' }}>

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
                  fontSize: 13,
                  color: '#fff',
                  background: 'linear-gradient(135deg, #106ba3, #2196f3)', // gradient
                  padding: '6px 14px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  marginTop: 10,
                  marginBottom: 10,
                  boxShadow: '0 3px 6px rgba(0,0,0,0.15)', // subtle depth
                  border: '1px solid #0d5c91', // defined edge
                  textTransform: 'uppercase', // bold label style
                  letterSpacing: '0.5px',
                }}
              >
                {subscription.toLowerCase() === 'starter'
                  ? '3 Bots Included'
                  : '5 Bots Included'}
              </div>


              {/* Horizontal layout for lists */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row', // explicit row direction
                  gap: '40px',
                  width: '100%', // ensure container has full width
                  justifyContent: 'space-between'
                }}
              >
                {/* Supported Channels */}
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ fontWeight: 600, color: '#394B59', marginBottom: 6 }}>
                    Supported Channels:
                  </div>
                  <ul style={{ paddingLeft: 16, margin: 0 }}>
                    {[
                      'Whatsapp',
                      'Web Channel',
                      'Telegram',
                      'Slack',
                      'Facebook Messenger',
                    ].map((ch, idx) =>
                      subscription === 'Starter' && ch === 'Whatsapp' ? null : (
                        <li key={idx} style={{ marginBottom: 6, color: '#106ba3' }}>
                          {ch}
                        </li>
                      )
                    )}
                  </ul>
                </div>


                {/* Includes */}
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ fontWeight: 600, color: '#394B59', marginBottom: 6 }}>
                    Includes:
                  </div>
                  <ul style={{ paddingLeft: 16, margin: 0 }}>
                    {['LLM Support', 'HITL (Human in the Loop)', 'Bot Analytics'].map(
                      (item, idx) => (
                        <li key={idx} style={{ marginBottom: 6, color: '#106ba3' }}>
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
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

          {/* Trial Plan Notification */}
          {!savedSubData.expired && savedFormData.nextSubs && (
            <>
              <br />
              <div
                style={{
                  marginBottom: 8,
                  padding: '10px 14px',
                  borderLeft: '4px solid #2196f3',
                  borderRight: '4px solid #2196f3',
                  background: 'linear-gradient(to right, rgba(33,150,243,0.08) 0%, rgba(33,150,243,0.08) 100%)', // extended blue gradient
                  borderRadius: 6,
                  fontSize: 14,
                  color: '#394B59',
                  lineHeight: 1.6,
                  fontStyle: 'italic',
                  textAlign: 'center' // center aligned text
                }}
              >
                {subscription === 'Trial' ? (
                  <span>
                    You opted for <strong style={{ textDecoration: 'underline' }}>{savedFormData.nextSubs.plan}</strong> plan on a{' '}
                    <strong style={{ textDecoration: 'underline' }}>{savedFormData.nextSubs.duration}</strong> basis after Trial, which you can change anytime.
                  </span>
                ) : (
                  <span>
                    You have downgraded your plan to <strong style={{ textDecoration: 'underline' }}>{savedFormData.nextSubs.plan}</strong> for the{' '}
                    <strong style={{ textDecoration: 'underline' }}>{savedFormData.nextSubs.duration}</strong> duration.
                  </span>
                )}
              </div></>
          )}

          <br />

          {/* Render the subscription status banner */}
          {renderAlertBanner()}
        </div>
      </Dialog>
    </div>
  )
}

