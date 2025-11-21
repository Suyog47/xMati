import { Button, Classes, Dialog, Intent } from '@blueprintjs/core'
import { lang } from 'botpress/shared'
import React, { FC } from 'react'
//import privacyPolicyPdf from '../../public/mist-privacy-policy.pdf'

interface Props {
  isOpen: boolean
  toggle: () => void
}

const PrivacyAgreement: FC<Props> = ({ isOpen, toggle }) => {
  return (
    <Dialog
      title="Privacy Policy"
      icon="document"
      isOpen={isOpen}
      onClose={toggle}
      transitionDuration={0}
      canOutsideClickClose={false}
      style={{ width: 700, maxHeight: '90vh' }}
    >
      <div className={Classes.DIALOG_BODY}>
        <div style={{ height: '70vh', overflow: 'hidden', padding: '0' }}>
          <object
            data={`${process.env.PUBLIC_URL || ''}/mist-privacy-policy.pdf#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0`}
            type="application/pdf"
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          >
            <p>
              Your browser can't display the PDF inline.{' '}
              {/* <a href={privacyPolicyPdf} target="_blank" rel="noopener noreferrer">
                Open the Privacy Policy in a new tab
              </a> */}
              .
            </p>
          </object>
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

export default PrivacyAgreement
