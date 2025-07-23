import {
  Alignment,
  Button,
  ButtonGroup,
  Callout,
  Checkbox,
  Dialog,
  Icon,
  InputGroup,
  Intent,
  Popover,
  PopoverInteractionKind,
  Position,
  Spinner
} from '@blueprintjs/core'
import { BotConfig } from 'botpress/sdk'
import { confirmDialog, lang, telemetry, toast } from 'botpress/shared'
import cx from 'classnames'
import _ from 'lodash'
import React, { Component, Fragment } from 'react'
import { connect, ConnectedProps } from 'react-redux'
import { generatePath, RouteComponentProps } from 'react-router'
import Subscription from '~/user/Subscription'
import api from '~/app/api'
import { Downloader } from '~/app/common/Downloader'
import LoadingSection from '~/app/common/LoadingSection'
import PageContainer from '~/app/common/PageContainer'
import SplitPage from '~/app/common/SplitPage'
import { AppState } from '~/app/rootReducer'
import AccessControl from '~/auth/AccessControl'
import { getActiveWorkspace } from '~/auth/basicAuth'
import { fetchLicensing } from '~/management/licensing/reducer'
import { fetchModules } from '~/management/modules/reducer'
import { fetchBotHealth, fetchBots, fetchBotNLULanguages } from '~/workspace/bots/reducer'
import { filterList } from '~/workspace/util'

import BotItemCompact from './BotItemCompact'
import BotItemPipeline from './BotItemPipeline'
import CreateBotModal from './CreateBotModal'
import EditStageModal from './EditStageModal'
import ImportBotModal from './ImportBotModal'
import RollbackBotModal from './RollbackBotModal'
import style from './style.scss'

const botFilterFields = ['name', 'id', 'description']

type Props = ConnectedProps<typeof connector> & RouteComponentProps

class Bots extends Component<Props> {
  formData = JSON.parse(localStorage.getItem('formData') || '{}')
  subData = JSON.parse(localStorage.getItem('subData') || '{}')
  state = {
    isCreateBotModalOpen: false,
    isRollbackModalOpen: false,
    isImportBotModalOpen: false,
    isEditStageModalOpen: false,
    focusedBot: null,
    selectedStage: null,
    archiveUrl: undefined,
    archiveName: '',
    filter: '',
    showFilters: false,
    needApprovalFilter: false,
    isExpired: false,
    isSubscriptionOpen: false,
    showExpiryPrompt: false,
    expiryMessage: '',
    numberOfBots: this.formData.numberOfBots || 0, // Initialize from localStorage
    isLoading: false, // existing loader state
    showSuggestionsDialog: false,
    upgradeSelectedDuration: 'monthly',
    upgradePrice: 100,
    upgradeInProgress: false // new state for upgrade loader
  }

  // New handler to update upgrade selection and price
  handleUpgradeDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = e.target.value
    let price = 100
    if (duration === 'half-yearly') {
      price = Math.round(100 * 6 * 0.97 * 100) / 100
    } else if (duration === 'yearly') {
      price = Math.round(100 * 12 * 0.95 * 100) / 100
    }
    this.setState({ upgradeSelectedDuration: duration, upgradePrice: price })
  }

  // New handler to call the /trial-sub-upgrade API with proper loader and error handling
  handleUpgradeNow = async (from) => {
    this.setState({ upgradeInProgress: true })
    const { upgradeSelectedDuration, upgradePrice } = this.state
    const email = this.formData.email
    const plan = from === 'upgrade' ? 'Professional' : 'Starter'

    try {
      const response = await fetch('https://www.app.xmati.ai/apis/trial-sub-upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          plan,
          duration: upgradeSelectedDuration,
          price: upgradePrice
        }),
      })

      const res = await response.json()

      if (!res.success) {
        toast.failure(lang.tr('Failed to save suggestion'))
        return
      }

      toast.success(lang.tr('Suggestion saved successfully'))
    } catch (err) {
      console.error(err)
      toast.failure(lang.tr('Failed to save suggestion'))
    } finally {
      this.setState({ showSuggestionsDialog: false, upgradeInProgress: false })
    }
  }

  async componentDidMount() {
    this.props.fetchBots()
    this.props.fetchBotHealth()
    this.props.fetchBotNLULanguages()

    if (!this.props.loadedModules.length && this.props.profile && this.props.profile.isSuperAdmin) {
      this.props.fetchModules()
    }

    if (!this.props.licensing) {
      this.props.fetchLicensing()
    }

    setTimeout(() => {
      this.formData = JSON.parse(localStorage.getItem('formData') || '{}')
      this.subData = JSON.parse(localStorage.getItem('subData') || '{}')

      this.state.numberOfBots = this.formData.numberOfBots || 0 // Initialize from localStorage
      console.log(this.formData)

      // Check subscription expiry from localStorage
      let expiry
      const daysRemaining = this.subData.daysRemaining || 0
      const subscription = this.subData.subscription || 'Trial'
      const promptRun = this.subData.promptRun || false

      if (subscription === 'Trial') {
        expiry = this.subData.expired || false
      } else {
        expiry = this.subData.expired && daysRemaining <= -4
      }

      this.setState({ isExpired: expiry })

      // check for prompt run status and trigger it accordingly
      if (!promptRun) {
        let msg
        if ((daysRemaining === 15 && subscription === 'Trial') || (daysRemaining < 0 && subscription === 'Trial')) {
          return
        }

        // This dialog should be shown only for Trial(non - cancelled) users before 1 to 3 days remaining for expiry
        if (daysRemaining <= 3 && daysRemaining > 0 &&
          this.subData.subscription === 'Trial' &&
          this.formData.nextSubs && this.formData.nextSubs.plan === 'Starter' &&
          this.formData.nextSubs && this.formData.nextSubs.suggested === false &&
          this.state.numberOfBots > 3 &&
          this.subData.isCancelled === false) {
          this.setState({ showSuggestionsDialog: true })
        }


        if (daysRemaining === 15 || daysRemaining === 7 || daysRemaining === 5 || daysRemaining === 3 || daysRemaining === 1) {

          if (this.subData.isCancelled === true) {
            msg = `You have ${daysRemaining} days left for expiry. You won't be able to use the services after that. Please visit the Subscription page to renew a plan.`
          } else {
            msg = `You have ${daysRemaining} days left for expiry. We will be renewing your subscription automatically. If you want to cancel the subscription, please visit the Subscription page.`
          }
        }

        if (daysRemaining === -1 || daysRemaining === -2 || daysRemaining === -3) {
          msg = `Currently your subscription plan has been expired. But ${(daysRemaining === -1) ? 'we have decided to give you' : 'you still have'} ${Math.abs(daysRemaining + 4)} complimentary days to renew your subscription.`
        }

        if (msg) {
          this.setState({
            showExpiryPrompt: true,
            expiryMessage: msg
          })

          localStorage.setItem('subData', JSON.stringify({ ... this.subData, promptRun: true }))  // set prompt run to false

          // Hide the prompt after 10 seconds
          setTimeout(() => {
            this.setState({ showExpiryPrompt: false })
          }, 10000)
        }

      }
    }, 1500) // Delay to ensure localStorage is populated

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    telemetry.startFallback(api.getSecured({ useV1: true })).catch()
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.numberOfBots !== this.props.numberOfBots) {
      this.setState({ numberOfBots: this.props.numberOfBots })
    }
  }

  toggleCreateBotModal = () => {
    this.setState({ isCreateBotModalOpen: !this.state.isCreateBotModalOpen })
  }

  toggleImportBotModal = () => {
    this.setState({ isImportBotModalOpen: !this.state.isImportBotModalOpen })
  }

  async exportBot(botId: string) {
    this.setState({
      archiveUrl: `/admin/workspace/bots/${botId}/export`,
      archiveName: `bot_${botId}_${Date.now()}.tgz`
    })
  }

  async deleteBot(botId: string) {
    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
    if (
      await confirmDialog(lang.tr('admin.workspace.bots.confirmDelete'), {
        acceptLabel: lang.tr('delete')
      })
    ) {
      this.setState({ isLoading: true }) // Show the loader
      try {
        await api.getSecured().post(`/admin/workspace/bots/${savedFormData.fullName}/${savedFormData.email}/${botId}/delete`)
        this.props.fetchBots()
        setTimeout(() => {
          window.location.reload()    // reloading for the bot creation limit check
        }, 500)
        toast.success(lang.tr('The bot has been deleted successfully'))
      } catch (err) {
        console.error(err)
        toast.failure(lang.tr('The bot could not be deleted'))
      } finally {
        this.setState({ isLoading: false }) // Hide the loader
      }
    }
  }

  async reloadBot(botId: string) {
    try {
      await api.getSecured().post(`/admin/workspace/bots/${botId}/reload`)
      this.props.fetchBots()
      this.props.fetchBotHealth()
      toast.success(lang.tr('admin.workspace.bots.remounted'))
    } catch (err) {
      console.error(err)
      toast.failure(lang.tr('admin.workspace.bots.couldNotMount'))
    }
  }

  viewLogs(botId: string) {
    this.props.history.push(
      generatePath('/workspace/:workspaceId?/logs?botId=:botId', {
        workspaceId: getActiveWorkspace() || undefined,
        botId
      })
    )
  }

  renderCreateNewBotButton() {
    const { subscription } = this.subData
    const { numberOfBots } = this.state

    // Determine the bot limit based on the subscription type
    const botLimit = subscription === 'Starter' ? 3 : 5

    // Check if the number of bots exceeds the limit
    if (numberOfBots >= botLimit) {
      return null // Do not render the button if the limit is reached
    }

    return (
      <AccessControl resource="admin.bots.*" operation="write">
        <Popover minimal interactionKind={PopoverInteractionKind.HOVER} position={Position.BOTTOM}>
          <Button
            id="btn-create-bot"
            intent={Intent.NONE}
            text={lang.tr('admin.workspace.bots.createBot')}
            rightIcon="caret-down"
          />
          <ButtonGroup vertical={true} minimal={true} fill={true} alignText={Alignment.LEFT}>
            <Button
              id="btn-new-bot"
              text={lang.tr('admin.workspace.bots.new')}
              icon="add"
              onClick={() => this.setState({ isCreateBotModalOpen: true })}
            />
            <Button
              id="btn-import-bot"
              text={lang.tr('admin.workspace.bots.importExisting')}
              icon="import"
              onClick={() => this.setState({ isImportBotModalOpen: true })}
            />
          </ButtonGroup>
        </Popover>
      </AccessControl>
    )
  }

  hasUnlangedBots = () => {
    return this.props.bots.reduce((hasUnlangedBots, bot) => hasUnlangedBots || !bot.defaultLanguage, false)
  }

  async requestStageChange(botId: string) {
    await api.getSecured({ timeout: 60000 }).post(`/admin/workspace/bots/${botId}/stage`)
    this.props.fetchBots()
    toast.success(lang.tr('admin.workspace.bots.promoted'))
  }

  async approveStageChange(botId) {
    await api.getSecured({ timeout: 60000 }).post(`/admin/workspace/bots/${botId}/approve-stage`)
    this.props.fetchBots()
    toast.success(lang.tr('admin.workspace.bots.approvedPromotion'))
  }

  isLicensed = () => {
    return _.get(this.props.licensing, 'status') === 'licensed'
  }

  async createRevision(botId) {
    await api.getSecured().post(`admin/workspace/bots/${botId}/revisions`)
    toast.success(lang.tr('admin.workspace.bots.revisionsCreated'))
  }

  toggleRollbackModal = (botId?: string) => {
    this.setState({
      focusedBot: typeof botId === 'string' ? botId : null,
      isRollbackModalOpen: !this.state.isRollbackModalOpen
    })
  }

  toggleSubscription = () => {
    this.setState({ isSubscriptionOpen: !this.state.isSubscriptionOpen })
  }

  handleRollbackSuccess = () => {
    this.props.fetchBots()
    toast.success(lang.tr('admin.workspace.bots.rollbackSuccess'))
  }

  handleEditStageSuccess = () => {
    this.props.fetchBots()
  }

  toggleEditStage = (stage?) => {
    this.setState({
      selectedStage: stage ? stage : null,
      isEditStageModalOpen: !this.state.isEditStageModalOpen
    })
  }

  toggleFilters = () => {
    this.setState({ showFilters: !this.state.showFilters })
  }

  findBotError(botId: string) {
    if (!this.props.health) {
      return false
    }

    return _.some(
      this.props.health.map(x => x.bots[botId]),
      s => s && s.status === 'unhealthy'
    )
  }

  renderCompactView(bots: BotConfig[]) {
    if (!bots.length) {
      return null
    }

    return (
      <div className={cx(style.bot_views, style.compact_view, style.table)}>
        {bots.map(bot => (
          <Fragment key={bot.id}>
            <BotItemCompact
              bot={bot}
              loadedModules={this.props.loadedModules}
              hasError={this.findBotError(bot.id)}
              deleteBot={this.deleteBot.bind(this, bot.id)}
              exportBot={this.exportBot.bind(this, bot.id)}
              // createRevision={this.createRevision.bind(this, bot.id)}
              // rollback={this.toggleRollbackModal.bind(this, bot.id)}
              reloadBot={this.reloadBot.bind(this, bot.id)}
              // viewLogs={this.viewLogs.bind(this, bot.id)}
              installedNLULanguages={this.props.language}
            />
          </Fragment>
        ))}
      </div>
    )
  }

  renderPipelineView(bots: BotConfig[]) {
    const { pipeline } = this.props.workspace || {}
    const { email, strategy } = this.props.profile || {}

    const botsByStage = _.groupBy(bots, 'pipeline_status.current_stage.id')
    const colSize = Math.floor(12 / pipeline.length)

    return (
      <Fragment>
        <div className={cx(style.row, style.pipeline_view, style.bot_views)}>
          {pipeline.map((stage, idx) => {
            const allowStageChange = this.isLicensed() && idx !== pipeline.length - 1
            return (
              <div key={stage.id} style={{ flex: colSize, marginRight: 20 }}>
                {pipeline.length > 1 && (
                  <div className={style.pipeline_title}>
                    <h3>{stage.label}</h3>
                    <AccessControl resource="admin.bots.*" operation="write" superAdmin>
                      <Button className={style.pipeline_edit_button} onClick={() => this.toggleEditStage(stage)}>
                        <Icon icon="edit" />
                      </Button>
                    </AccessControl>
                  </div>
                )}
                {idx === 0 && (
                  <div className={cx(style.pipeline_bot, style.create)}>{this.renderCreateNewBotButton()}</div>
                )}
                {(botsByStage[stage.id] || []).map(bot => (
                  <Fragment key={bot.id}>
                    <BotItemPipeline
                      loadedModules={this.props.loadedModules}
                      bot={bot}
                      isApprover={stage.reviewers.find(r => r.email === email && r.strategy === strategy) !== undefined}
                      userEmail={email!}
                      userStrategy={strategy!}
                      hasError={this.findBotError(bot.id)}
                      allowStageChange={allowStageChange && !bot.disabled}
                      requestStageChange={this.requestStageChange.bind(this, bot.id)}
                      approveStageChange={this.approveStageChange.bind(this, bot.id)}
                      deleteBot={this.deleteBot.bind(this, bot.id)}
                      exportBot={this.exportBot.bind(this, bot.id)}
                      createRevision={this.createRevision.bind(this, bot.id)}
                      rollback={this.toggleRollbackModal.bind(this, bot.id)}
                      reloadBot={this.reloadBot.bind(this, bot.id)}
                      viewLogs={this.viewLogs.bind(this, bot.id)}
                      installedNLULanguages={this.props.language}
                    />
                  </Fragment>
                ))}
              </div>
            )
          })}
        </div>
      </Fragment>
    )
  }

  filterStageApproval(bot: BotConfig, email: string, strategy: string) {
    if (!this.props.workspace || !this.state.needApprovalFilter) {
      return true
    }
    const { pipeline } = this.props.workspace
    const { current_stage, stage_request } = bot.pipeline_status

    const reviewers = _.get(current_stage && pipeline.find(x => x.id === current_stage.id), 'reviewers', [])
    const isReviewer = reviewers.find(x => x.strategy === strategy && x.email === email)

    return stage_request && isReviewer
  }

  renderBots() {
    const { email, strategy } = this.props.profile || {}

    const filteredBots = filterList<BotConfig>(this.props.bots, botFilterFields, this.state.filter).filter(x =>
      this.filterStageApproval(x, email!, strategy!)
    )

    const hasBots = !!this.props.bots.length
    const botsView = this.isPipelineView ? this.renderPipelineView(filteredBots) : this.renderCompactView(filteredBots)

    return (
      <div>
        {hasBots && (
          <Fragment>
            <div className={style.filterWrapper}>
              <InputGroup
                id="input-filter"
                placeholder={lang.tr('admin.workspace.bots.filter')}
                value={this.state.filter}
                onChange={e => this.setState({ filter: e.target.value.toLowerCase() })}
                autoComplete="off"
                className={style.filterField}
              />
              {this.isPipelineView && <Button icon="filter" onClick={this.toggleFilters}></Button>}
            </div>
            {this.state.showFilters && (
              <div className={style.extraFilters}>
                <h2>{lang.tr('admin.workspace.bots.extraFilters')}</h2>
                <Checkbox
                  label={lang.tr('admin.workspace.bots.needYourApproval')}
                  checked={this.state.needApprovalFilter}
                  onChange={e => this.setState({ needApprovalFilter: e.currentTarget.checked })}
                ></Checkbox>
              </div>
            )}

            {this.state.filter && !filteredBots.length && (
              <Callout title={lang.tr('admin.workspace.bots.noBotMatches')} className={style.filterCallout} />
            )}
          </Fragment>
        )}

        {!hasBots && (
          <Callout title={lang.tr('admin.workspace.bots.noBotYet')} className={style.filterCallout}>
            <p>
              <br />
              {lang.tr('admin.workspace.bots.alwaysAssignedToWorkspace')}
              <br />
              {lang.tr('admin.workspace.bots.createYourFirstBot')}
            </p>
          </Callout>
        )}

        {this.hasUnlangedBots() && (
          <Callout intent={Intent.WARNING}>{lang.tr('admin.workspace.bots.noSpecifiedLanguage')}</Callout>
        )}
        {botsView}
      </div>
    )
  }

  get isPipelineView() {
    return this.props.workspace && this.props.workspace.pipeline && this.props.workspace.pipeline.length > 1
  }

  render() {
    const { showExpiryPrompt, expiryMessage, isLoading, showSuggestionsDialog, upgradeSelectedDuration, upgradePrice, upgradeInProgress } = this.state

    if (!this.props.bots) {
      return <LoadingSection />
    }

    return (
      <PageContainer title={lang.tr('admin.workspace.bots.bots')}>
        {/* Full-screen loader for other actions */}
        {isLoading && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.37)',
              zIndex: 9999,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Spinner intent="primary" size={50} />
          </div>
        )}

        {/* Full-screen loader for upgrade suggestion */}
        {upgradeInProgress && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.75)',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '1.5em',
              color: '#106ba3'
            }}
          >
            <Spinner intent="primary" size={50} />
            <div style={{ marginTop: '20px' }}>suggestion getting saved</div>
          </div>
        )}

        {/* Expiry Prompt */}
        {showExpiryPrompt && (
          <div className={style.expiryPrompt}>
            {expiryMessage}
          </div>
        )}

        {/* Subscription suggestion Dialog Professional upgrade UI */}
        {showSuggestionsDialog && (
          <Dialog
            isOpen={true}
            canEscapeKeyClose={false}
            canOutsideClickClose={false}
            icon="info-sign"
            title="Subscription Suggestion"
            style={{ width: '700px', textAlign: 'center' }}
          >
            <div style={{ padding: '30px' }}>
              <p>
                You have originally opted for {(this.formData.nextSubs && this.formData.nextSubs.plan) || 'Starter'} plan for the {(this.formData.nextSubs && this.formData.nextSubs.duration) || 'certain'} duration.
              </p>
              <p>However, we have noticed that you are using more than 3 bots, so we suggest you to upgrade the plan from Starter to Professional, as Starter plan supports maximum 3 bots.</p>

              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                {/* Professional Plan Container - 60% width */}
                <div style={{
                  flex: '0 0 50%',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}>
                  <h2 style={{ color: '#333', marginBottom: '10px', textDecoration: 'underline' }}>Professional</h2>
                  <h3 style={{ color: '#555', margin: '0 0 10px 0' }}>$100/month</h3>
                  <p style={{ color: 'black', fontWeight: 'bold', fontSize: '1.1em' }}>5 bots included</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px' }}>
                    <div style={{ textAlign: 'left', fontSize: '0.9em', color: '#555' }}>
                      <strong>Includes:</strong>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginLeft: '0' }}>
                        <li>LLM Support</li>
                        <li>HITL Enabled</li>
                        <li>Bot Analytics</li>
                      </ul>
                    </div>
                    <div style={{ textAlign: 'left', fontSize: '0.9em', color: '#555' }}>
                      <strong>Supported Channels:</strong>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginLeft: '0' }}>
                        <li>WhatsApp</li>
                        <li>Web Chat</li>
                        <li>Telegram</li>
                        <li>Slack</li>
                        <li>Facebook Messenger</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Subscription Duration Selection Box - 40% width */}
                <div style={{
                  flex: '0 0 50%',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  textAlign: 'left'
                }}>
                  <h3 style={{ marginBottom: '15px', color: '#333' }}>Subscription Duration</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '1.1em', color: '#555' }}>
                      <input
                        type="radio"
                        name="upgradeDuration"
                        value="monthly"
                        checked={upgradeSelectedDuration === 'monthly'}
                        onChange={this.handleUpgradeDurationChange}
                        style={{ marginRight: '10px' }}
                      />
                      <span style={{ fontWeight: 500 }}>Monthly</span>
                    </label>
                    <label style={{ fontSize: '1em', color: '#555' }}>
                      <input
                        type="radio"
                        name="upgradeDuration"
                        value="half-yearly"
                        checked={upgradeSelectedDuration === 'half-yearly'}
                        onChange={this.handleUpgradeDurationChange}
                        style={{ marginRight: '10px' }}
                      />
                      <span style={{ fontWeight: 500 }}>Half-Yearly</span> <span style={{ fontSize: '0.9em', color: 'green' }}>(3% discount)</span>
                    </label>
                    <label style={{ fontSize: '1em', color: '#555' }}>
                      <input
                        type="radio"
                        name="upgradeDuration"
                        value="yearly"
                        checked={upgradeSelectedDuration === 'yearly'}
                        onChange={this.handleUpgradeDurationChange}
                        style={{ marginRight: '10px' }}
                      />
                      <span style={{ fontWeight: 500 }}>Yearly</span> <span style={{ fontSize: '0.9em', color: 'green' }}>(5% discount)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#333' }}>
                  Amount:  ${upgradePrice}
                  {upgradeSelectedDuration === 'monthly'
                    ? ' per month'
                    : upgradeSelectedDuration === 'half-yearly'
                      ? ' half-yearly'
                      : ' yearly'}
                </p>
              </div>

              {/* Big Horizontal Buttons */}
              <div style={{ display: 'flex', marginTop: '30px', gap: '10px' }}>
                <button
                  style={{
                    flex: 1,
                    backgroundColor: '#106ba3',
                    color: 'white',
                    height: '60px',
                    fontSize: '18px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() => this.handleUpgradeNow('upgrade')}
                >
                  Upgrade Now
                </button>

                <button
                  style={{
                    flex: 1,
                    backgroundColor: '#c23030',
                    color: 'white',
                    height: '60px',
                    fontSize: '18px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() => this.handleUpgradeNow('current')}
                >
                  No, Keep the current
                </button>
              </div>
            </div>
          </Dialog>
        )}

        <SplitPage sideMenu={(this.state.isExpired) ? !this.isPipelineView : !this.isPipelineView && this.renderCreateNewBotButton()}>
          <Fragment>
            <Subscription
              isOpen={this.state.isSubscriptionOpen}
              toggle={this.toggleSubscription}
            />
            {this.state.isExpired && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '400px',
                  padding: '20px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  backgroundColor: 'white',
                }}
              >
                <h3>
                  Your {(this.subData.subscription === 'Trial') ? 'Trial' : this.subData.subscription} subscription {(this.subData.subscription !== 'Trial') ? 'and a 3 day complimentary trial' : ''} has been Expired
                </h3>
                <p style={{ margin: '20px 0' }}>
                  To continue using the platform, please purchase a subscription.
                </p>
                <Button
                  intent={Intent.PRIMARY}
                  text="Subscribe"
                  onClick={this.toggleSubscription}
                />
              </div>
            )}

            {/* Render the rest of the content if not expired */}
            {!this.state.isExpired && (
              <>
                <Downloader url={this.state.archiveUrl} filename={this.state.archiveName} />
                {this.renderBots()}
                <AccessControl resource="admin.bots.*" operation="write">
                  <RollbackBotModal
                    botId={this.state.focusedBot}
                    isOpen={this.state.isRollbackModalOpen}
                    toggle={this.toggleRollbackModal}
                    onRollbackSuccess={this.handleRollbackSuccess}
                  />
                  <EditStageModal
                    workspace={this.props.workspace}
                    stage={this.state.selectedStage}
                    isOpen={this.state.isEditStageModalOpen}
                    toggle={this.toggleEditStage}
                    onEditSuccess={this.handleEditStageSuccess}
                  />
                  <CreateBotModal
                    isOpen={this.state.isCreateBotModalOpen}
                    toggle={this.toggleCreateBotModal}
                    existingBots={this.props.bots}
                    onCreateBotSuccess={this.props.fetchBots}
                  />
                  <ImportBotModal
                    isOpen={this.state.isImportBotModalOpen}
                    toggle={this.toggleImportBotModal}
                    onCreateBotSuccess={this.props.fetchBots}
                  />
                </AccessControl>
              </>
            )}
          </Fragment>
        </SplitPage>
      </PageContainer>
    )
  }
}

const mapStateToProps = (state: AppState) => ({
  loadedModules: state.modules.loadedModules,
  bots: state.bots.bots,
  health: state.bots.health,
  workspace: state.bots.workspace,
  loading: state.bots.loadingBots,
  licensing: state.licensing.license,
  profile: state.user.profile,
  language: state.bots.nluLanguages,
  numberOfBots: state.bots.numberOfBots, // Add numberOfBots
})

const mapDispatchToProps = {
  fetchBots,
  fetchLicensing,
  fetchBotHealth,
  fetchModules,
  fetchBotNLULanguages
}

const connector = connect(mapStateToProps, mapDispatchToProps)

export default connector(Bots)
