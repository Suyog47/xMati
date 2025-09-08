import React from 'react'
import { Button, Classes, Dialog, FormGroup, InputGroup } from '@blueprintjs/core'
import Select from 'react-select'
import { lang } from 'botpress/shared'

export interface BotInfoDialogProps {
  isOpen: boolean
  toggleDialog: () => void
  handleNameChanged: (e: React.ChangeEvent<HTMLInputElement>) => void
  handlePromptChanged: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleTemplateChanged: (selectedTemplate: any) => void
  openChannelDialog: (e: React.MouseEvent) => void
  isProcessing: boolean
  botName: string
  botPrompt: string
  selectedTemplate?: any
  templates: any[]
}

const BotInfoDialog: React.FC<BotInfoDialogProps> = ({
  isOpen,
  toggleDialog,
  handleNameChanged,
  handlePromptChanged,
  handleTemplateChanged,
  openChannelDialog,
  isProcessing,
  botName,
  botPrompt,
  selectedTemplate,
  templates,
}) => {

  const isButtonDisabled = () => {
    if (!botName.trim() || isProcessing) {
      return true
    }
    if (!botPrompt.trim() && !selectedTemplate) {
      return true
    }
    if (botPrompt.trim() && botPrompt.trim().length < 10) {
      return true
    }
    return false
  }

  return (
    <Dialog
      title={lang.tr('admin.workspace.bots.create.newBot')}
      icon="add"
      isOpen={isOpen}
      onClose={toggleDialog}
      transitionDuration={0}
      canOutsideClickClose={false}
    >
      <form>
        <div className={Classes.DIALOG_BODY}>
          <p>Select from the ready-made templates or provide a prompt according to your need</p>
          <FormGroup
            label={lang.tr('admin.workspace.bots.create.name')}
            labelFor="bot-name"
            labelInfo="*"
            helperText={lang.tr('admin.workspace.bots.create.nameHelper')}
          >
            <InputGroup
              id="input-bot-name"
              tabIndex={1}
              placeholder={lang.tr('admin.workspace.bots.create.namePlaceholder')}
              minLength={0}
              maxLength={50}
              required
              value={botName}
              onChange={handleNameChanged}
              autoFocus
            />
          </FormGroup>

          <FormGroup
            label={lang.tr('admin.workspace.bots.create.prompt')}
            labelFor="bot-prompt"
            labelInfo="*"
            helperText={lang.tr('admin.workspace.bots.create.promptHelper')}
          >
            <textarea
              id="bot-prompt"
              tabIndex={2}
              placeholder={lang.tr('admin.workspace.bots.create.promptPlaceholder')}
              minLength={0}
              maxLength={500}
              required
              value={botPrompt}
              onChange={handlePromptChanged}
              rows={3}
              style={{
                resize: 'none',
                height: '120px',
                width: '100%',
                overflow: 'auto',
              }}
              disabled={!!selectedTemplate}
            />
          </FormGroup>
          {botPrompt.trim() && botPrompt.trim().length < 10 && (
            <p style={{ color: 'red' }}>
              Bot prompt must be at least 10 characters.
            </p>
          )}

          <p style={{ textAlign: 'center' }}>
            <b>Or</b>
          </p>

          {templates.length > 0 && (
            <FormGroup
              label={lang.tr('admin.workspace.bots.create.template')}
              labelFor="template"
            >
              <Select
                id="select-bot-templates"
                tabIndex="4"
                options={[
                  { id: '', name: 'Select template' },
                  ...templates
                ]}
                value={
                  selectedTemplate && selectedTemplate.id
                    ? selectedTemplate
                    : { id: '', name: 'Select template' }
                }
                onChange={selectedTemplate => {
                  handleTemplateChanged(selectedTemplate)
                }}
                isDisabled={!!botPrompt}
                getOptionLabel={o => o.name}
                getOptionValue={o => o.id}
              />
            </FormGroup>
          )}
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              id="btn-modal-next"
              type="submit"
              text={isProcessing ? lang.tr('pleaseWait') : 'Next'}
              onClick={openChannelDialog}
              disabled={isButtonDisabled()}
              intent="primary"
            />
          </div>
        </div>
      </form>
    </Dialog>
  )
}

export default BotInfoDialog
