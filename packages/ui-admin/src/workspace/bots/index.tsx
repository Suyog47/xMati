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
import { isDarkTheme } from '@blueprintjs/core/lib/esm/common/utils'
import { is } from 'bluebird'
import { BotConfig } from 'botpress/sdk'
import { confirmDialog, lang, telemetry, toast } from 'botpress/shared'
import cx from 'classnames'
import _ from 'lodash'
import React, { Component, Fragment } from 'react'
import { connect, ConnectedProps } from 'react-redux'
import { generatePath, RouteComponentProps } from 'react-router'
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
import Subscription from '~/user/Subscription-screens/Subscription'
import { fetchBotHealth, fetchBots, fetchBotNLULanguages } from '~/workspace/bots/reducer'
import { filterList } from '~/workspace/util'
import packageJson from '../../../../../package.json'
import BotItemCompact from './BotItemCompact'
import BotItemPipeline from './BotItemPipeline'
import CreateBotModal from './CreateBot-screens/CreateBotModal'
import EditStageModal from './EditStageModal'
import ImportBotModal from './ImportBotModal'
import RollbackBotModal from './RollbackBotModal'
import style from './style.scss'

const CURRENT_VERSION = packageJson.version
const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

const botFilterFields = ['name', 'id', 'description']

type Props = ConnectedProps<typeof connector> & RouteComponentProps

class Bots extends Component<Props> {
  formData = JSON.parse(localStorage.getItem('formData') || '{}')
  subData = JSON.parse(localStorage.getItem('subData') || '{}')
  token = JSON.parse(localStorage.getItem('token') || '{}')
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
    showBotsExceedDialog: false,
    showExpiryPrompt: false,
    expiryMessage: '',
    numberOfBots: this.formData.numberOfBots || 0, // Initialize from localStorage
    isLoading: false, // existing loader state
    showSuggestionsDialog: false,
    upgradeSelectedDuration: 'monthly',
    upgradePrice: 100,
    upgradeInProgress: false, // new state for upgrade loader
    selectedBotIds: [] as string[], // new state for selected bot ids in the Bots limit exceeded Dialog
  }

  // New handler to update upgrade selection and price
  handleUpgradeDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = e.target.value
    let price = 25
    if (duration === 'half-yearly') {
      price = Math.round(25 * 6 * 0.95 * 100) / 100   // 5% discount for half-yearly
    } else if (duration === 'yearly') {
      price = Math.round(25 * 12 * 0.85 * 100) / 100 // 15% discount for yearly
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
      const response = await fetch(`${API_URL}/pro-suggestion-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
          'X-App-Version': CURRENT_VERSION
        },
        body: JSON.stringify({
          email,
          plan,
          duration: upgradeSelectedDuration,
          price: upgradePrice,
          isDowngrade: false // Default to false
        })
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

  // New handler to update checkbox selection for each bot
  handleCheckboxChange = (botId: string) => {
    this.setState(prevState => {
      const selectedBotIds = this.state.selectedBotIds.includes(botId)
        ? this.state.selectedBotIds.filter(id => id !== botId)
        : [...this.state.selectedBotIds, botId]
      return { selectedBotIds }
    })
  }

  // Revised handler for confirming selected bots
  handleConfirmSelectedBots = async () => {
    const botIds = [...this.state.selectedBotIds]
    if (!botIds.length) {
      return
    }

    this.setState({ isLoading: true, showBotsExceedDialog: false, selectedBotIds: [] })

    const successBots: string[] = []
    const failedBots: string[] = []

    for (const botId of botIds) {
      try {
        await this.deleteBot(botId, false) // Disable confirmation for batch deletion
        successBots.push(botId)
      } catch (err) {
        failedBots.push(botId)
      }
    }

    this.setState({ isLoading: false })

    if (successBots.length) {
      toast.success(`${successBots.length} bot(s) deleted successfully.`)
    }
    if (failedBots.length) {
      toast.failure(`Failed to delete: ${failedBots.join(', ')}`)
    }
    this.props.fetchBots()
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

      // Auto-select bots with 'twilio' channel key
      if (this.formData.filteredBots && this.formData.filteredBots.length) {
        const autoSelected = this.formData.filteredBots
          .filter((bot: any) => bot.messaging?.channels && Object.keys(bot.messaging.channels)[0] === 'twilio')
          .map((bot: any) => bot.id)
        this.setState({ selectedBotIds: autoSelected })
      }

      this.state.numberOfBots = this.formData.numberOfBots || 0 // Initialize from localStorage
      // console.log(this.formData)
      // console.log(this.subData)
      // console.log(this.token)

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

      if (subscription === 'Starter' && !expiry && this.state.numberOfBots > 3) {
        this.setState({ showBotsExceedDialog: true })
      }

      // check for prompt run status and trigger it accordingly
      if (!promptRun) {
        let msg
        if ((daysRemaining === 15 && subscription === 'Trial') || (daysRemaining < 0 && subscription === 'Trial')) {
          return
        }

        // This dialog should be shown only for Trial(non - cancelled) users before 1 to 3 days remaining for expiry
        if (daysRemaining <= 3 && daysRemaining > 0 &&
          subscription === 'Trial' &&
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

          // Hide the prompt after 8 seconds
          setTimeout(() => {
            this.setState({ showExpiryPrompt: false })
          }, 8000)
        }

      }
    }, 700) // Delay to ensure localStorage is populated

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

  async deleteBot(botId: string, enableCheck = true) {
    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')

    if (enableCheck) {
      const confirmed = await confirmDialog(lang.tr('admin.workspace.bots.confirmDelete'), {
        acceptLabel: lang.tr('delete')
      })
      if (!confirmed) {
        return
      }
    }

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
        <Popover
          minimal={false}
          interactionKind={PopoverInteractionKind.CLICK}
          position={Position.BOTTOM}
          content={
            <div
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minWidth: '220px',
                background: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
              }}
            >
              <Button
                id="btn-new-bot"
                text={lang.tr('admin.workspace.bots.new')}
                icon="add"
                intent={Intent.PRIMARY}
                style={{
                  height: '45px',
                  borderRadius: '6px'
                }}
                onClick={() => this.setState({ isCreateBotModalOpen: true })}
              />
              <Button
                id="btn-import-bot"
                text={lang.tr('admin.workspace.bots.importExisting')}
                icon="import"
                intent={Intent.SUCCESS}
                style={{
                  height: '45px',
                  borderRadius: '6px'
                }}
                onClick={() => this.setState({ isImportBotModalOpen: true })}
              />
            </div>
          }
        >
          <Button
            id="btn-create-bot"
            intent={Intent.NONE}
            text={lang.tr('admin.workspace.bots.createBot')}
            rightIcon="caret-down"
            style={{
              height: '45px',
              background: '#f0f5ff',
              border: '1px solid #c3d4ff',
              borderRadius: '6px',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '15px',
              color: '#304ffe'
            }}
          />
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
                    <p>{stage.label}</p>
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
    const { filter, showFilters, needApprovalFilter } = this.state

    const filteredBots = filterList<BotConfig>(this.props.bots, botFilterFields, this.state.filter).filter(x =>
      this.filterStageApproval(x, email!, strategy!)
    )

    const hasBots = !!this.props.bots.length
    const botsView = this.isPipelineView ?
      this.renderPipelineView(filteredBots) :
      this.renderCompactView(filteredBots)

    return (
      <div className={style.container}>
        {/* Header with title and stats */}
        <div className={style.header}>
          <div className={style.titleSection}>
            <h1 className={style.title}>{'Your Bots'}</h1>
            {hasBots && (
              <span className={style.botCount}>
                {filteredBots.length} of {(this.subData.subscription === 'Starter') ? '3' : '5'} bots
              </span>
            )}
          </div>

          {/* Create new bot button */}
          {this.renderCreateNewBotButton()}
        </div>

        {/* Main content area */}
        <div className={style.content}>
          {hasBots ? (
            <>
              {/* Search and filter section */}
              <div className={style.searchFilterSection}>
                <div className={style.searchContainer}>
                  <InputGroup
                    leftIcon="search"
                    id="input-filter"
                    placeholder={lang.tr('admin.workspace.bots.filter')}
                    value={filter}
                    onChange={e => this.setState({ filter: e.target.value.toLowerCase() })}
                    autoComplete="off"
                    className={style.searchField}
                  />

                  {this.isPipelineView && (
                    <Button
                      icon="filter"
                      onClick={this.toggleFilters}
                      minimal={true}
                      active={showFilters}
                      className={style.filterToggle}
                    >
                      {lang.tr('admin.workspace.bots.filters')}
                    </Button>
                  )}
                </div>

                {/* View toggle */}
                {/* <div className={style.viewToggle}>
                  <ButtonGroup>
                    <Button
                      icon="grid-view"
                      active={!this.isPipelineView}
                      onClick={() => this.setState({ isPipelineView: false })}
                      minimal={true}
                    />
                    <Button
                      icon="diagram-tree"
                      active={this.isPipelineView}
                      onClick={() => this.setState({ isPipelineView: true })}
                      minimal={true}
                    />
                  </ButtonGroup>
                </div> */}
              </div>

              {/* Extra filters panel */}
              {showFilters && (
                <div className={style.extraFiltersPanel}>
                  <div className={style.extraFiltersHeader}>
                    <h4>{lang.tr('admin.workspace.bots.extraFilters')}</h4>
                    <Button
                      icon="cross"
                      minimal={true}
                      small={true}
                      onClick={this.toggleFilters}
                    />
                  </div>
                  <div className={style.extraFiltersContent}>
                    <Checkbox
                      label={lang.tr('admin.workspace.bots.needYourApproval')}
                      checked={needApprovalFilter}
                      onChange={e => this.setState({ needApprovalFilter: e.currentTarget.checked })}
                    />
                    {/* Additional filters could be added here */}
                  </div>
                </div>
              )}

              {/* No results message */}
              {filter && !filteredBots.length && (
                <Callout
                  title={lang.tr('admin.workspace.bots.noBotMatches')}
                  icon="search"
                  intent={Intent.WARNING}
                  className={style.noResultsCallout}
                >
                </Callout>
              )}
            </>
          ) : (
            <>
              {/* Empty state */}
              <div className={style.emptyState}>
                <div className={style.emptyStateIllustration}>
                  <Icon icon="cube" iconSize={64} />
                </div>
                <Callout
                  title={lang.tr('admin.workspace.bots.noBotYet')}
                  className={style.emptyStateCallout}
                >
                  <p>{lang.tr('admin.workspace.bots.alwaysAssignedToWorkspace')}</p>
                  <p>{lang.tr('admin.workspace.bots.createYourFirstBot')}</p>
                </Callout>
              </div>
            </>
          )}

          {/* Warning for bots without language */}
          {this.hasUnlangedBots() && (
            <Callout
              intent={Intent.WARNING}
              icon="translate"
              className={style.warningCallout}
            >
              {lang.tr('admin.workspace.bots.noSpecifiedLanguage')}
            </Callout>
          )}

          {/* Bots list/pipeline view */}
          <div className={style.botsContainer}>
            {botsView}
          </div>
        </div>
      </div >
    )
  }

  get isPipelineView() {
    return this.props.workspace && this.props.workspace.pipeline && this.props.workspace.pipeline.length > 1
  }

  render() {
    const { showExpiryPrompt, expiryMessage, isLoading, showSuggestionsDialog, showBotsExceedDialog, upgradeSelectedDuration, upgradePrice, upgradeInProgress, selectedBotIds } = this.state

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
              alignItems: 'center'
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

        {/* Subscription suggestion Dialog UI */}
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

              <br />
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
                  <h3 style={{ color: '#555', margin: '0 0 10px 0' }}>
                    $
                    {upgradeSelectedDuration === 'monthly'
                      ? upgradePrice
                      : upgradeSelectedDuration === 'half-yearly'
                        ? (upgradePrice / 6).toFixed(2)
                        : (upgradePrice / 12).toFixed(2)}
                    /month
                  </h3>
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
                      <span style={{ fontWeight: 500 }}>Half-Yearly</span> <span style={{ fontSize: '0.9em', color: 'green' }}>(5% discount)</span>
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
                      <span style={{ fontWeight: 500 }}>Yearly</span> <span style={{ fontSize: '0.9em', color: 'green' }}>(15% discount)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#333' }}>
                  Amount:  <span style={{ textDecoration: 'underline' }}>${upgradePrice}</span>
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

        {/* Bots limit exceeded UI */}
        {showBotsExceedDialog && (
          <Dialog
            isOpen={true}
            canEscapeKeyClose={false}
            canOutsideClickClose={false}
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Icon
                  icon="warning-sign"
                  iconSize={24}
                  intent={Intent.WARNING}
                  style={{ marginRight: '10px' }}
                />
                <span style={{ fontSize: '20px', fontWeight: 600 }}>
                  Bots Limit Exceeded
                </span>
              </div>
            }
            style={{
              width: '700px',
              borderRadius: '8px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
              background: '#f8f9fa'
            }}
          >
            <div style={{ padding: '25px' }}>
              <div style={{
                background: '#fffbea',
                padding: '15px',
                borderRadius: '6px',
                borderLeft: '4px solid #ffc107',
                marginBottom: '20px'
              }}>
                <p style={{ margin: '0', color: '#856404', fontWeight: 500 }}>
                  Your current Starter plan allows a maximum of 3 bots.
                  Please remove {Math.max(this.formData.filteredBots?.length - 3, 0)} bot(s) to continue.
                </p>
              </div>

              <div style={{ margin: '15px 0 5px' }}>
                <p style={{ fontWeight: 500, marginBottom: '10px' }}>
                  Select bots to remove (click to select):
                </p>
                <div style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '5px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '12px'
                }}>
                  {this.formData.filteredBots && this.formData.filteredBots.length ? (
                    this.formData.filteredBots.map((bot: { id: string; name: string; messaging: { channels: { [key: string]: any } } }) => (
                      <div
                        key={bot.id}
                        style={{
                          padding: '15px',
                          borderRadius: '8px',
                          transition: 'all 0.2s',
                          border: this.state.selectedBotIds.includes(bot.id)
                            ? '2px solid #1890ff'
                            : '1px solid #e1e8ed',
                          background: this.state.selectedBotIds.includes(bot.id)
                            ? '#e6f7ff'
                            : '#fff',
                          boxShadow: this.state.selectedBotIds.includes(bot.id)
                            ? '0 4px 8px rgba(24, 144, 255, 0.2)'
                            : '0 2px 4px rgba(0, 0, 0, 0.05)',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onClick={() => this.handleCheckboxChange(bot.id)}
                      >
                        {this.state.selectedBotIds.includes(bot.id) && (
                          <div style={{
                            position: 'absolute',
                            top: '0',
                            right: '0',
                            background: '#1890ff',
                            color: 'white',
                            padding: '2px 8px',
                            fontSize: '12px',
                            borderBottomLeftRadius: '6px'
                          }}>
                            <Icon icon="tick" iconSize={12} />
                          </div>
                        )}
                        <div style={{ fontWeight: 600, marginBottom: '5px' }}>{bot.name}</div>
                        <div style={{ fontSize: '13px', color: '#6c757d' }}>ID: {bot.id}</div>
                        <div style={{ fontSize: '13px', color: '#6c757d' }}>
                          Channel: {' '}
                          {
                            bot.messaging?.channels
                              ? Object.keys(bot.messaging.channels)[0] === 'twilio'
                                ? 'Whatsapp'
                                : Object.keys(bot.messaging.channels)[0].charAt(0).toUpperCase() + Object.keys(bot.messaging.channels)[0].slice(1)
                              : 'Web Chat'
                          }
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: '#6c757d',
                      gridColumn: '1 / -1'
                    }}>
                      <Icon icon="info-sign" />
                      <p style={{ marginTop: '10px' }}>No bots available</p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '25px',
                paddingTop: '15px',
                borderTop: '1px solid #eee'
              }}>
                <Button
                  intent={Intent.PRIMARY}
                  text={`Bots Selected (${this.state.selectedBotIds.length})`}
                  onClick={this.handleConfirmSelectedBots}
                  disabled={(this.formData.filteredBots.length - this.state.selectedBotIds.length > 3)}
                  style={{ width: '70%', height: '50px', minWidth: '180px' }}
                />
              </div>
            </div>
          </Dialog>
        )}

        <SplitPage sideMenu={(this.state.isExpired) ? !this.isPipelineView : !this.isPipelineView}>
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
                  backgroundColor: 'white'
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
