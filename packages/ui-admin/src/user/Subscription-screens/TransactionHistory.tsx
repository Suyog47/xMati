import React from 'react'
import { Icon, Spinner } from '@blueprintjs/core'

interface TransactionHistoryProps {
  transactions: any[]
  isLoadingTransactions: boolean
  fetchTransactions: () => Promise<void>
  downloadCSV: () => Promise<void>
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  isLoadingTransactions,
  fetchTransactions,
  downloadCSV,
}) => {
  return (
    <div
      style={{
        flex: 1.5,
        background: '#f5f7fa',
        borderRadius: 8,
        padding: 20,
        minWidth: 300,
        height: 570, // Fixed height
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 8px #e0e0e0',
      }}
    >
      {/* Header with title + reload button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.2em' }}>Transaction History</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Icon
            icon="refresh"
            iconSize={18}
            intent="primary"
            style={{
              cursor: isLoadingTransactions ? 'not-allowed' : 'pointer',
              opacity: isLoadingTransactions ? 0.4 : 1,
            }}
            onClick={() => {
              if (!isLoadingTransactions) {
                void fetchTransactions()
              }
            }}
            title="Reload"
          />
          <button
            onClick={() => {
              if (!isLoadingTransactions && transactions.length > 0) {
                void downloadCSV()
              }
            }}
            style={{
              backgroundColor: '#106ba3',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '1em',
              fontWeight: 500,
              cursor:
                transactions.length === 0 || isLoadingTransactions
                  ? 'not-allowed'
                  : 'pointer',
              opacity:
                transactions.length === 0 || isLoadingTransactions ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            disabled={transactions.length === 0 || isLoadingTransactions}
          >
            <span role="img" aria-label="download">
              📥
            </span>{' '}
            Download CSV
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoadingTransactions ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              width: '100%',
            }}
          >
            <Spinner size={38} />
          </div>
        ) : (
          <div style={{ color: '#888', fontSize: '1em' }}>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center' }}>No transactions yet.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {transactions.map((txn, idx) => (
                  <li
                    key={idx}
                    style={{
                      background: 'white',
                      marginBottom: '12px',
                      padding: '16px',
                      borderRadius: '6px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      borderLeft: '4px solid #106ba3',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {/* Subscription Header */}
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '1.1em',
                          color: '#102a43',
                          marginBottom: '6px',
                        }}
                      >
                        {`Subscription: ${txn.metadata?.subscription || '---'}`}
                      </div>

                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '1em',
                          color: '#102a43',
                          marginBottom: 4,
                        }}
                      >
                        Transaction ID:{' '}
                        <span
                          style={{
                            fontFamily: 'monospace',
                            color: '#5c7080',
                          }}
                        >
                          {txn.id}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.9em',
                          color: '#5c7080',
                          marginBottom: 4,
                        }}
                      >
                        {new Date(txn.created * 1000).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </div>

                      {/* Duration */}
                      <div
                        style={{
                          fontSize: '0.9em',
                          color: '#5c7080',
                          marginBottom: '4px',
                          fontWeight: 500,
                        }}
                      >
                        Duration: {txn.metadata?.duration || 'N/A'}
                      </div>

                      <div
                        style={{
                          fontSize: '0.85em',
                          color:
                            txn.refunded || txn.status !== 'succeeded'
                              ? 'red'
                              : 'green',
                        }}
                      >
                        Status: {txn.refunded ? 'Refunded' : txn.status}
                      </div>

                      {/* Partial Refund Details */}
                      {!txn.refunded && txn.refunds?.data?.length > 0 && (
                        <div
                          style={{
                            fontSize: '0.8em',
                            color: '#b58900',
                            marginTop: '6px',
                          }}
                        >
                          <strong>Partial Refund:</strong>
                          <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                            {txn.refunds.data.map((refund, refundIdx) => (
                              <li key={refundIdx}>
                                Amount Refunded: ${refund.amount / 100} on{' '}
                                {new Date(refund.created * 1000).toLocaleDateString(
                                  'en-US',
                                  {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  }
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: txn.refunded ? 'red' : '#28a745',
                        textAlign: 'right',
                      }}
                    >
                      ${txn.amount / 100}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TransactionHistory
