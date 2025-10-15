import { Icon, Spinner, Dialog, Classes } from '@blueprintjs/core'
import React, { useState } from 'react'

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
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleTransactionClick = (transaction: any) => {
    setSelectedTransaction(transaction)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedTransaction(null)
  }

  return (
    <>
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
                        alignItems: 'center',
                        borderLeft: '4px solid #106ba3',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => handleTransactionClick(txn)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        {/* Minimal Transaction Info */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontWeight: 600,
                            fontSize: '1em',
                            color: '#102a43',
                            marginBottom: 4,
                          }}
                        >
                          <span>{txn.metadata?.subscription || 'Subscription Payment'}</span>
                          {/* Refund Indicators */}
                          {txn.refunded && (
                            <span
                              style={{
                                backgroundColor: '#d13212',
                                color: 'white',
                                fontSize: '0.7em',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}
                            >
                              Refunded
                            </span>
                          )}
                          {!txn.refunded && txn.refunds?.data?.length > 0 && (
                            <span
                              style={{
                                backgroundColor: '#ff9800',
                                color: 'white',
                                fontSize: '0.7em',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}
                            >
                              Partial Refund
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '0.85em',
                            color: '#5c7080',
                            marginBottom: 4,
                          }}
                        >
                          {new Date(txn.created * 1000).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div
                          style={{
                            fontSize: '0.8em',
                            color:
                              txn.refunded || txn.status !== 'succeeded'
                                ? '#d13212'
                                : '#0d8050',
                            fontWeight: 500,
                          }}
                        >
                          {txn.refunded ? 'Refunded' : txn.status?.charAt(0).toUpperCase() + txn.status?.slice(1)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: txn.refunded ? '#d13212' : '#0d8050',
                            textAlign: 'right',
                          }}
                        >
                          ${(txn.amount / 100).toFixed(2)}
                        </div>
                        <Icon
                          icon="chevron-right"
                          iconSize={16}
                          style={{ color: '#5c7080' }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Dialog */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title="Transaction Details"
        style={{ width: '600px' }}
        className={Classes.DIALOG}
      >
        <div className={Classes.DIALOG_BODY}>
          {selectedTransaction && (
            <div style={{ padding: '16px' }}>
              {/* Header Section */}
              <div style={{
                background: 'linear-gradient(135deg, #106ba3 0%, #0f5a8a 100%)',
                color: 'white',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '1.4em' }}>
                  {selectedTransaction.metadata?.subscription || 'Subscription Payment'}
                </h3>
                <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                  ${(selectedTransaction.amount / 100).toFixed(2)}
                </div>
              </div>

              {/* Transaction Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{ fontSize: '0.9em', color: '#5c7080', fontWeight: 600 }}>
                    Transaction ID
                  </label>
                  <div style={{
                    fontFamily: 'monospace',
                    padding: '8px 12px',
                    background: '#f5f7fa',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    marginTop: '4px'
                  }}>
                    {selectedTransaction.id}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.9em', color: '#5c7080', fontWeight: 600 }}>
                    Status
                  </label>
                  <div style={{
                    padding: '8px 12px',
                    background: selectedTransaction.refunded || selectedTransaction.status !== 'succeeded'
                      ? '#fef5f5' : '#f0f9f4',
                    color: selectedTransaction.refunded || selectedTransaction.status !== 'succeeded'
                      ? '#d13212' : '#0d8050',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    fontWeight: 600,
                    marginTop: '4px'
                  }}>
                    {selectedTransaction.refunded ? 'Refunded' : selectedTransaction.status?.charAt(0).toUpperCase() + selectedTransaction.status?.slice(1)}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.9em', color: '#5c7080', fontWeight: 600 }}>
                    Date & Time
                  </label>
                  <div style={{
                    padding: '8px 12px',
                    background: '#f5f7fa',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    marginTop: '4px'
                  }}>
                    {new Date(selectedTransaction.created * 1000).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.9em', color: '#5c7080', fontWeight: 600 }}>
                    Duration
                  </label>
                  <div style={{
                    padding: '8px 12px',
                    background: '#f5f7fa',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    marginTop: '4px'
                  }}>
                    {selectedTransaction.metadata?.duration || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Refund Information */}
              {selectedTransaction.refunds?.data?.length > 0 && (
                <div style={{
                  background: '#fff8e1',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #ffb300'
                }}>
                  <h4 style={{ margin: 0, marginBottom: '12px', color: '#e65100' }}>
                    Refund Information
                  </h4>
                  {selectedTransaction.refunds.data.map((refund: any, refundIdx: number) => (
                    <div key={refundIdx} style={{
                      background: 'white',
                      padding: '12px',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                          Refund #{refundIdx + 1}
                        </div>
                        <div style={{ fontSize: '0.9em', color: '#5c7080' }}>
                          {new Date(refund.created * 1000).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '1.1em',
                        fontWeight: 'bold',
                        color: '#d13212'
                      }}>
                        -${(refund.amount / 100).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <button
              onClick={handleCloseDialog}
              style={{
                backgroundColor: '#106ba3',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

export default TransactionHistory
