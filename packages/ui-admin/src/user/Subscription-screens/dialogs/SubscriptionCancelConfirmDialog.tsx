import React from 'react'
import { Dialog, Button, Spinner } from '@blueprintjs/core'

interface RefundDetails {
  usedMonth?: number
  monthlyAmount?: number
  usedAmount?: number
  remainingMonths?: number
  refundAmount?: string
  daysRemainingInCycle?: number
  message?: string
}

interface SubscriptionCancelConfirmDialogProps {
  isOpen: boolean
  subscription: string
  refundDetails?: RefundDetails | null
  isCancelProcessing: boolean
  onConfirmCancel: () => void
  onClose: () => void
}

const SubscriptionCancelConfirmDialog: React.FC<SubscriptionCancelConfirmDialogProps> = ({
  isOpen,
  subscription,
  refundDetails,
  isCancelProcessing,
  onConfirmCancel,
  onClose
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Subscription Cancellation"
      icon="warning-sign"
      canOutsideClickClose={false}
    >
      {isCancelProcessing && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(255,255,255,0.9)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              border: '6px solid #eee',
              borderTop: '6px solid #106ba3',
              borderRadius: '50%',
              width: 55,
              height: 55,
              animation: 'spin 1s linear infinite',
              marginBottom: 20
            }}
          />
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
          <div style={{ fontSize: 18, color: '#106ba3', fontWeight: 600 }}>
            Processing your cancellation...
          </div>
        </div>
      )}
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2 style={{ color: '#d9822b', marginBottom: '12px' }}>Are you sure you want to cancel?</h2>
        <p style={{ fontSize: '1em', color: '#555', marginBottom: 20 }}>
          {subscription === 'Trial' ? (
            <>
              Cancelling will stop your subscription from activating after the trial period.
              You can continue using the service until your trial ends.
            </>
          ) : refundDetails ? (
            <>
              Your subscription will remain active until{' '}
              <strong>
                <u>
                  {new Date(
                    new Date().setDate(new Date().getDate() + (refundDetails.daysRemainingInCycle || 0))
                  ).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </u>
              </strong>.
              Below is a breakdown of your cancellation details:
            </>
          ) : (
            <>
              Cancelling will keep your subscription active until the end of the current billing cycle.
              Refunds (if any) will be processed automatically.
            </>
          )}
        </p>
        {refundDetails && (
          <div
            style={{
              background: '#f9f9f9',
              border: '1px solid #eee',
              borderRadius: 8,
              padding: '16px',
              textAlign: 'left',
              fontSize: '0.95em',
              maxWidth: 480,
              margin: '0 auto 20px',
              lineHeight: 1.5
            }}
          >
            <h4 style={{ marginTop: 0, marginBottom: 12, color: '#106ba3' }}>
              Refund Calculation:
            </h4>
            <p style={{ marginBottom: 10 }}>
              You will be charged for <strong>{refundDetails.usedMonth}</strong> month(s) at <strong>${refundDetails.monthlyAmount}</strong> each.
            </p>
            <p style={{ marginBottom: 10 }}>
              So far you have been charged <strong>${refundDetails.usedAmount}</strong>, and you have <strong>{refundDetails.remainingMonths}</strong> month(s) left unused.
            </p>
            <p style={{ marginBottom: 10 }}>
              Your refund amount is <strong>${refundDetails.refundAmount}</strong>.
            </p>
            <hr style={{ margin: '14px 0' }} />
            <div
              style={{
                fontSize: '1.1em',
                fontWeight: 600,
                textAlign: 'center',
                color: Number(refundDetails.refundAmount) > 0 ? '#106ba3' : '#d33'
              }}
            >
              {Number(refundDetails.refundAmount) > 0 ? (
                <>💰 Your refund amount is <strong style={{ fontSize: '1.3em' }}><u>${refundDetails.refundAmount}</u></strong></>
              ) : (
                <>⚠️ No refund will be processed</>
              )}
            </div>
          </div>
        )}
        <div style={{ marginTop: 12, color: '#c23030', fontSize: '1.1em' }}>
          ⚠️ This action is <strong>irreversible</strong>.
          You will be logged out and must log in again.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
          <Button
            intent="danger"
            onClick={onConfirmCancel}
            style={{
              padding: '12px 28px',
              fontSize: '1em',
              fontWeight: 600,
              minWidth: '220px',
              borderRadius: 6,
              cursor: isCancelProcessing ? 'not-allowed' : 'pointer',
              opacity: isCancelProcessing ? 0.5 : 1
            }}
            disabled={isCancelProcessing}
          >
            {isCancelProcessing ? 'Processing...' : 'Confirm Cancellation'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export default SubscriptionCancelConfirmDialog
