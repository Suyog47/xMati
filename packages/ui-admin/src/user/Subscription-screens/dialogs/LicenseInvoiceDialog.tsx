import { Dialog, Button } from '@blueprintjs/core'
import React from 'react'

interface InvoiceDetails {
  userName: string
  email: string
  subscriptionName: string
  amount: any
  paymentType: string
  duration: string
}

interface SubscriptionInvoiceLicenseDialogProps {
  isOpen: boolean
  invoiceDetails: InvoiceDetails
  onClose: () => void
  setIsSuccessDialogOpen: (val: boolean) => void
}

const SubscriptionInvoiceLicenseDialog: React.FC<SubscriptionInvoiceLicenseDialogProps> = ({
  isOpen,
  invoiceDetails,
  onClose,
  setIsSuccessDialogOpen
}) => {

  const handlePrint = () => {
    // Create a new window with printable content
    const printWindow = window.open('', '_blank', 'width=800,height=600')

    if (printWindow) {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice and License Agreement of xMati</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #106ba3;
              padding-bottom: 15px;
            }
            .invoice-section { 
              margin-bottom: 30px; 
            }
            .invoice-section h2 { 
              color: #106ba3; 
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .invoice-details { 
              margin: 15px 0; 
            }
            .invoice-details p { 
              margin: 10px 0; 
              padding: 8px;
              background-color: #f8f9fa;
              border-left: 3px solid #106ba3;
            }
            .license-section h2 { 
              color: #106ba3; 
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .license-text { 
              white-space: pre-wrap; 
              font-size: 0.9em; 
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Invoice and License Agreement of xMati</h1>
            <p>Generated on: ${new Date().toLocaleDateString()} for ${invoiceDetails.userName}</p>
          </div>
          
          <div class="invoice-section">
            <h2>Invoice Details</h2>
            <div class="invoice-details">
              <p><strong>Subscription Name:</strong> ${invoiceDetails.subscriptionName}</p>
              <p><strong>Amount:</strong> ${invoiceDetails.amount} (${invoiceDetails.paymentType})</p>
              <p><strong>Duration:</strong> ${invoiceDetails.duration}</p>
            </div>
          </div>
          
          <br />
           
          <div class="license-section">
            <h2>License Agreement</h2>
            <div class="license-text">${licenseAgreement}</div>
          </div>
        </body>
        </html>
      `

      printWindow.document.write(printContent)
      printWindow.document.close()

      // Wait for content to load, then show print dialog
      printWindow.onload = () => {
        printWindow.print()
        // Optional: Close the window after printing
        printWindow.onafterprint = () => {
          printWindow.close()
        }
      }
    }
  }

  const handleSendEmail = () => {
    // Create email content
    const subject = encodeURIComponent('Invoice and License Agreement of xMati')
    const body = encodeURIComponent(`
Dear User,

Please find below your invoice details and license agreement of xMati:

Invoice for ${invoiceDetails.userName}

INVOICE DETAILS:
Subscription Name: ${invoiceDetails.subscriptionName}
Amount: ${invoiceDetails.amount} (${invoiceDetails.paymentType})
Duration: ${invoiceDetails.duration}

LICENSE AGREEMENT:
${licenseAgreement}

Best regards,
Support Team
    `)

    // Create mailto URL
    const mailtoUrl = `mailto:${invoiceDetails.email}?subject=${subject}&body=${body}`

    // Open default mail application
    window.location.href = mailtoUrl
  }

  const handleNext = () => {
    setIsSuccessDialogOpen(true)
    onClose()
  }

  const licenseAgreement = `
    This License Agreement ("Agreement") is entered into by and between the user ("You") and the service provider ("Company"). By accessing or using the service, You agree to be bound by the terms and conditions of this Agreement. If You do not agree, do not use the service.

    1. Grant of License
    The Company grants You a non-exclusive, non-transferable, revocable license to use the service for personal or business purposes, subject to the terms of this Agreement.

    2. Restrictions
    You shall not:
    - Modify, copy, or create derivative works of the service.
    - Reverse engineer, decompile, or disassemble the service.
    - Rent, lease, or sublicense the service to any third party.

    3. Ownership
    All intellectual property rights in the service remain the exclusive property of the Company. This Agreement does not grant You any ownership rights.

    4. Termination
    The Company may terminate this Agreement at any time if You breach any of its terms. Upon termination, You must cease all use of the service.

    5. Disclaimer of Warranties
    The service is provided "as is" without any warranties, express or implied, including but not limited to warranties of merchantability or fitness for a particular purpose.

    6. Limitation of Liability
    In no event shall the Company be liable for any indirect, incidental, or consequential damages arising out of the use or inability to use the service.

    7. Governing Law
    This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which the Company is located.

    8. Entire Agreement
    This Agreement constitutes the entire agreement between You and the Company regarding the service and supersedes all prior agreements.

    By using the service, You acknowledge that You have read, understood, and agree to be bound by this Agreement.

    END OF AGREEMENT
  `

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        onClose()
        setIsSuccessDialogOpen(true)
      }}
      title="Subscription Details"
      icon="document"
      canOutsideClickClose={false}
      style={{ width: '60vw', height: '93vh' }} // Adjusted dialog height
    >
      <div style={{ display: 'flex', padding: '20px', height: 'calc(100% - 80px)' }}>
        {/* Invoice Details Section */}
        <div
          style={{
            flex: '0 0 35%',
            padding: '16px',
            borderRight: '1px solid #ddd',
            overflowY: 'auto',
          }}
        >
          <h3 style={{ marginBottom: '12px', color: '#106ba3', fontSize: '1.2em' }}>
            Invoice Details
          </h3>
          <br />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <p style={{ fontSize: '1.0em', marginBottom: 0 }}>
              <strong>Subscription Name:</strong> {invoiceDetails.subscriptionName}
            </p>
            <hr style={{ margin: 0, borderColor: '#ddd', borderWidth: '0.5px' }} />
            <p style={{ fontSize: '1.0em', marginBottom: 0 }}>
              <strong>Amount:</strong> {invoiceDetails.amount} ({invoiceDetails.paymentType})
            </p>
            <hr style={{ margin: 0, borderColor: '#ddd', borderWidth: '0.5px' }} />
            <p style={{ fontSize: '1.0em', marginBottom: 0 }}>
              <strong>Duration:</strong> {invoiceDetails.duration}
            </p>
          </div>
        </div>

        {/* License Agreement Section */}
        <div
          style={{
            flex: '1',
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 16,
            paddingBottom: 5,
            overflowY: 'auto', // Makes the license section scrollable
          }}
        >
          <h3 style={{ marginBottom: '12px', color: '#106ba3', fontSize: '1.2em' }}>
            License Agreement
          </h3>
          <p
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
              fontSize: '0.9em',
              fontWeight: 'bold',
            }}
          >
            {licenseAgreement}
          </p>
        </div>
      </div>

      {/* Footer Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '25px', // Gap between buttons
          padding: '10px',
          borderTop: '1px solid #ddd',
        }}
      >
        <Button
          intent="primary"
          onClick={handlePrint}
          style={{
            padding: '12px 24px',
            fontSize: '1.1em',
            fontWeight: 'bold',
          }}
        >
          Print
        </Button>
        <Button
          intent="success"
          onClick={handleSendEmail}
          style={{
            padding: '12px 25px',
            fontSize: '1.1em',
            fontWeight: 'bold',
          }}
        >
          Send Email
        </Button>
        <Button
          intent="warning"
          onClick={handleNext}
          style={{
            padding: '12px 25px',
            fontSize: '1.1em',
            fontWeight: 'bold',
          }}
        >
          Next
        </Button>
      </div>
    </Dialog>
  )
}

export default SubscriptionInvoiceLicenseDialog
