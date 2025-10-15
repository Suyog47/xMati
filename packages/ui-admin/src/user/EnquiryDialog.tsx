import { Dialog, Button, Spinner, Card, Elevation } from '@blueprintjs/core'
import { toast } from 'botpress/shared'
import React, { FC, useState } from 'react'

interface Enquiry {
  id: string
  email: string
  enquiry: string
  submittedAt: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

const EnquiryDialog: FC<Props> = ({ isOpen, onClose }) => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [isLoading, setLoading] = useState(false)
  const token = JSON.parse(localStorage.getItem('token') || '{}')

  const getEnquiries = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/get-enquiries`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      })
      const result = await response.json()

      if (result.success) {
        setEnquiries(result.data)
      } else {
        toast.failure(`Failed to fetch enquiries: ${result.msg}`)
      }
    } catch (error) {
      toast.failure('Failed to fetch enquiries.')
    } finally {
      setLoading(false)
    }
  }

  // Group enquiries by email
  const groupedEnquiries = React.useMemo(() => {
    const grouped: { [email: string]: Enquiry[] } = {}
    enquiries.forEach((enquiry) => {
      if (!grouped[enquiry.email]) {
        grouped[enquiry.email] = []
      }
      grouped[enquiry.email].push(enquiry)
    })

    // Sort enquiries within each group by submission date (newest first)
    Object.keys(grouped).forEach((email) => {
      grouped[email].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    })

    return grouped
  }, [enquiries])

  // Fetch enquiries when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      void getEnquiries()
    }
  }, [isOpen])

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="User Enquiries"
      canOutsideClickClose={true}
      style={{
        width: '90vw',
        maxWidth: '900px',
        height: '95vh',
        maxHeight: '95vh',
        padding: 0,
        borderRadius: '10px',
      }}
    >
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Spinner size={50} />
        </div>
      )}

      <div style={{ padding: '24px', height: '94%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>
            Total Enquiries: {enquiries.length}
          </h3>
          <Button
            icon="refresh"
            intent="primary"
            onClick={() => void getEnquiries()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {enquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
              No enquiries found
            </div>
          ) : (
            Object.entries(groupedEnquiries).map(([email, userEnquiries]) => (
              <Card
                key={email}
                elevation={Elevation.TWO}
                style={{
                  marginBottom: '20px',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '2px solid #e1e8ed',
                  backgroundColor: '#fafbfc'
                }}
              >
                {/* User Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '2px solid #e1e8ed'
                }}>
                  <h4 style={{
                    margin: 0,
                    color: '#2c5aa0',
                    fontSize: '18px',
                    fontWeight: 600
                  }}>
                    {email}
                  </h4>
                  <div style={{
                    backgroundColor: '#2c5aa0',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {userEnquiries.length} {userEnquiries.length === 1 ? 'Query' : 'Queries'}
                  </div>
                </div>

                {/* User's Enquiries */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {userEnquiries.map((enquiry, index) => (
                    <div
                      key={enquiry.id}
                      style={{
                        backgroundColor: 'white',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        position: 'relative'
                      }}
                    >
                      {/* Query Number and Date */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#666',
                          backgroundColor: '#f0f0f0',
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          Query #{userEnquiries.length - index}
                        </span>
                        <small style={{ color: '#666', fontSize: '12px' }}>
                          {new Date(enquiry.submittedAt).toLocaleDateString()} at{' '}
                          {new Date(enquiry.submittedAt).toLocaleTimeString()}
                        </small>
                      </div>

                      {/* Query Content */}
                      <div
                        style={{
                          backgroundColor: '#f8f9fa',
                          padding: '12px',
                          borderRadius: '6px',
                          borderLeft: '4px solid #2c5aa0',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}
                      >
                        {enquiry.enquiry}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Dialog>
  )
}

export default EnquiryDialog
