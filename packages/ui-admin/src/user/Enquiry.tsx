import { Button, Classes, Dialog, Intent, TextArea, Spinner, Card, Elevation, Tabs, Tab } from '@blueprintjs/core'
import { lang, toast } from 'botpress/shared'
import React, { FC, useState, useEffect } from 'react'
import packageJson from '../../../../package.json'

const CURRENT_VERSION = packageJson.version
const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

interface Props {
  isOpen: boolean
  toggle: () => void
}

interface UserEnquiry {
  id: string
  email: string
  enquiry: string
  submittedAt: string
}

const Enquiry: FC<Props> = ({ isOpen, toggle }) => {
  const [enquiryText, setEnquiryText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userEnquiries, setUserEnquiries] = useState<UserEnquiry[]>([])
  const [isLoadingEnquiries, setIsLoadingEnquiries] = useState(false)
  const [selectedTab, setSelectedTab] = useState('submit')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc') // newest first by default

  const fetchUserEnquiries = async () => {
    setIsLoadingEnquiries(true)
    try {
      const formData = JSON.parse(localStorage.getItem('formData') || '{}')
      const token = sessionStorage.getItem('token') || ''
      const userEmail = formData.email || ''

      const response = await fetch(`${API_URL}/get-user-enquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-App-Version': CURRENT_VERSION
        },
        body: JSON.stringify({ email: userEmail })
      })

      const result = await response.json()

      if (result.success) {
        setUserEnquiries(result.data || [])
      } else {
        console.error('Failed to fetch user enquiries:', result.message)
      }
    } catch (error) {
      console.error('Error fetching user enquiries:', error)
    } finally {
      setIsLoadingEnquiries(false)
    }
  }

  const handleSubmit = async () => {
    if (!enquiryText.trim()) {
      return
    }

    setIsLoading(true)

    try {
      const formData = JSON.parse(localStorage.getItem('formData') || '{}')
      const token = sessionStorage.getItem('token') || ''
      const userEmail = formData.email || ''

      const response = await fetch(`${API_URL}/submit-enquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-App-Version': CURRENT_VERSION
        },
        body: JSON.stringify({
          email: userEmail,
          enquiry: enquiryText,
        })
      })

      const result = await response.json()

      if (result.success) {
        setEnquiryText('')
        toast.success('Enquiry submitted successfully! Our support team will get back to you soon.')
        // Refresh the enquiries list
        await fetchUserEnquiries()
        setSelectedTab('history')
      } else {
        toast.failure(result.message || 'Failed to submit enquiry. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting enquiry:', error)
      toast.failure('Error submitting enquiry: Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading && !isLoadingEnquiries) {
      setEnquiryText('')
      setSelectedTab('submit')
      toggle()
    }
  }

  useEffect(() => {
    if (isOpen) {
      void fetchUserEnquiries()
    }
  }, [isOpen])

  // Loader overlay styles
  const loaderOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 99999, // Ensure it overlays the dialog
  }

  const loaderTextStyle: React.CSSProperties = {
    marginTop: 24,
    fontSize: 20,
    fontWeight: 500,
    color: 'black'
  }

  return (
    <>
      <Dialog
        title="Support & Enquiries"
        icon="help"
        isOpen={isOpen}
        onClose={handleClose}
        transitionDuration={0}
        canOutsideClickClose={!isLoading && !isLoadingEnquiries}
        canEscapeKeyClose={!isLoading && !isLoadingEnquiries}
        style={{ width: 700, height: '600px' }}
      >
        <div className={Classes.DIALOG_BODY} style={{ padding: '20px 0', height: 'calc(100% - 120px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Tabs
              id="enquiry-tabs"
              selectedTabId={selectedTab}
              onChange={(tabId) => setSelectedTab(tabId as string)}
            >
              <Tab
                id="submit"
                title="Submit New Enquiry"
                panel={
                  <div style={{ padding: '20px 0', height: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '15px', flex: 1 }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}>
                        How can we help you?
                      </label>
                      <TextArea
                        value={enquiryText}
                        onChange={(e) => setEnquiryText(e.target.value)}
                        placeholder="Please describe your enquiry, feedback, or any questions you may have..."
                        rows={12}
                        fill
                        style={{
                          resize: 'none',
                          height: '300px',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}
                        disabled={isLoading}
                      />
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      fontStyle: 'italic',
                      marginTop: '10px'
                    }}>
                      Our support team will review your enquiry and get back to you as soon as possible.
                    </div>
                  </div>
                }
              />
              <Tab
                id="history"
                title={`My Enquiries (${userEnquiries.length})`}
                panel={
                  <div style={{ padding: '20px 0', height: '450px', display: 'flex', flexDirection: 'column' }}>
                    {/* Sort and Refresh buttons at the top */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '15px' }}>
                      <Button
                        icon={sortOrder === 'desc' ? 'sort-desc' : 'sort-asc'}
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        disabled={isLoadingEnquiries}
                        intent={Intent.PRIMARY}
                        minimal
                        style={{
                          backgroundColor: '#04A9E1',
                          color: 'white'
                        }}
                        title={`Sort ${sortOrder === 'desc' ? 'Oldest First' : 'Newest First'}`}
                      />
                      <Button
                        icon="refresh"
                        onClick={() => void fetchUserEnquiries()}
                        disabled={isLoadingEnquiries}
                        loading={isLoadingEnquiries}
                        intent={Intent.PRIMARY}
                        minimal
                        style={{
                          backgroundColor: '#04A9E1',
                          color: 'white'
                        }}
                        title="Refresh Enquiries"
                      />
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                      {isLoadingEnquiries ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                          <Spinner size={40} />
                        </div>
                      ) : userEnquiries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                          <p>No enquiries submitted yet.</p>
                          <p>Click on "Submit New Enquiry" tab to submit your first enquiry.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingRight: '8px' }}>
                          {userEnquiries
                            .sort((a, b) => {
                              const dateA = new Date(a.submittedAt).getTime()
                              const dateB = new Date(b.submittedAt).getTime()
                              return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
                            })
                            .map((enquiry, index) => (
                              <Card
                                key={enquiry.id}
                                elevation={Elevation.ONE}
                                style={{
                                  padding: '16px',
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #e1e8ed'
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '12px'
                                }}>
                                  <span style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#666',
                                    backgroundColor: '#e8f4f8',
                                    padding: '4px 8px',
                                    borderRadius: '12px'
                                  }}>
                                    Enquiry #{sortOrder === 'desc' ? userEnquiries.length - index : index + 1}
                                  </span>
                                  <small style={{ color: '#666', fontSize: '12px' }}>
                                    {new Date(enquiry.submittedAt).toLocaleDateString()} at{' '}
                                    {new Date(enquiry.submittedAt).toLocaleTimeString()}
                                  </small>
                                </div>
                                <div
                                  style={{
                                    backgroundColor: 'white',
                                    padding: '12px',
                                    borderRadius: '6px',
                                    borderLeft: '4px solid #04A9E1',
                                    fontSize: '14px',
                                    lineHeight: '1.5'
                                  }}
                                >
                                  {enquiry.enquiry}
                                </div>
                              </Card>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                }
              />
            </Tabs>
          </div>
        </div>

        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            {selectedTab === 'submit' && (
              <Button
                onClick={handleSubmit}
                intent={Intent.PRIMARY}
                disabled={!enquiryText.trim() || isLoading}
                loading={isLoading}
              >
                Submit Enquiry
              </Button>
            )}
          </div>
        </div>

        {/* Full screen loader overlay */}
        {isLoading && (
          <div style={loaderOverlayStyle}>
            <Spinner size={50} />
            <div style={loaderTextStyle}>Your Enquiry is being submitted</div>
          </div>
        )}
      </Dialog>
    </>
  )
}

export default Enquiry
