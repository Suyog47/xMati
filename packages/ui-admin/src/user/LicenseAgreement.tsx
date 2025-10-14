import { Button, Classes, Dialog, Intent } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import React, { FC } from 'react'

interface Props {
  isOpen: boolean
  toggle: () => void
}

const LicenseAgreement: FC<Props> = ({ isOpen, toggle }) => {
  return (
    <Dialog
      title="License Agreement"
      icon="document"
      isOpen={isOpen}
      onClose={toggle}
      transitionDuration={0}
      canOutsideClickClose={false}
      style={{ width: 700, maxHeight: '80vh' }}
    >
      <div className={Classes.DIALOG_BODY}>
        <div style={{ maxHeight: '60vh', overflow: 'auto', padding: '10px' }}>
          <h3>xMati Platform License Agreement</h3>

          <h4>1. License Grant</h4>
          <p>
            Subject to the terms and conditions of this Agreement, xMati grants you a limited,
            non-exclusive, non-transferable license to use the xMati platform services.
          </p>

          <h4>2. Permitted Use</h4>
          <p>
            You may use the xMati platform for creating and managing conversational AI bots
            in accordance with your subscription plan and these terms.
          </p>

          <h4>3. Restrictions</h4>
          <p>
            You may not: (a) reverse engineer, decompile, or disassemble the software;
            (b) use the platform for any illegal or unauthorized purpose;
            (c) violate any applicable laws or regulations.
          </p>

          <h4>4. Data and Privacy</h4>
          <p>
            Your use of the platform is subject to our Privacy Policy. You are responsible
            for ensuring compliance with applicable data protection laws.
          </p>

          <h4>5. Subscription Terms</h4>
          <p>
            Access to the platform is provided based on your active subscription.
            Features and limitations vary by subscription tier.
          </p>

          <h4>6. Intellectual Property</h4>
          <p>
            All rights, title, and interest in the xMati platform remain with xMati.
            You retain ownership of your content and data.
          </p>

          <h4>7. Limitation of Liability</h4>
          <p>
            xMati shall not be liable for any indirect, incidental, special, or
            consequential damages arising from your use of the platform.
          </p>

          <h4>8. Termination</h4>
          <p>
            This license may be terminated by either party upon notice. Upon termination,
            you must cease all use of the platform.
          </p>

          <h4>9. Governing Law</h4>
          <p>
            This Agreement shall be governed by and construed in accordance with applicable laws.
          </p>

          <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={toggle} intent={Intent.PRIMARY}>
            {lang.tr('close')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export default LicenseAgreement
