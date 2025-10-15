import { Button, Classes, Dialog, Intent, TextArea, Spinner } from '@blueprintjs/core'
import { lang, toast } from 'botpress/shared'
import React, { FC, useState } from 'react'

const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

interface Props {
  isOpen: boolean
  toggle: () => void
}

const Enquiry: FC<Props> = ({ isOpen, toggle }) => {
  const [enquiryText, setEnquiryText] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!enquiryText.trim()) {
      return
    }

    setIsLoading(true)

    try {
      const formData = JSON.parse(localStorage.getItem('formData') || '{}')
      const token = JSON.parse(localStorage.getItem('token') || '{}')
      const userEmail = formData.email || ''

      const response = await fetch(`${API_URL}/submit-enquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: userEmail,
          enquiry: enquiryText,
        })
      })

      const result = await response.json()

      if (result.success) {
        setEnquiryText('')
        toggle()
        toast.success('Enquiry submitted successfully! Our support team will get back to you soon.')
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
    if (!isLoading) {
      setEnquiryText('')
      toggle()
    }
  }

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
        title="Submit Enquiry"
        icon="help"
        isOpen={isOpen}
        onClose={handleClose}
        transitionDuration={0}
        canOutsideClickClose={!isLoading}
        canEscapeKeyClose={!isLoading}
        style={{ width: 600, maxHeight: '80vh' }}
      >
        <div className={Classes.DIALOG_BODY}>
          <div style={{ marginBottom: '15px' }}>
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
              rows={8}
              fill
              style={{
                resize: 'vertical',
                minHeight: '150px',
                maxHeight: '300px',
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

        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              intent={Intent.PRIMARY}
              disabled={!enquiryText.trim() || isLoading}
              loading={isLoading}
            >
              Submit Enquiry
            </Button>
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
