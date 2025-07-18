import { BotConfig, BotTemplate, Logger, Stage, WorkspaceUserWithAttributes } from 'botpress/sdk'
import cluster from 'cluster'
import { findDeletedFiles } from 'common/fs'
import { BotHealth, ServerHealth } from 'common/typings'
import { BotCreationSchema, BotEditSchema, isValidBotId } from 'common/validation'
import { createForGlobalHooks } from 'core/app/api'
import { TYPES } from 'core/app/types'
import { FileContent, GhostService, ReplaceContent } from 'core/bpfs'
import { CMSService } from 'core/cms'
import { ConfigProvider } from 'core/config'
import { JobService, makeRedisKey } from 'core/distributed'
import { MessagingService } from 'core/messaging'
import { extractArchive } from 'core/misc/archive'
import { listDir } from 'core/misc/list-dir'
import { stringify } from 'core/misc/utils'
import { ModuleResourceLoader, ModuleLoader } from 'core/modules'
import { InvalidOperationError } from 'core/routers'
import { AnalyticsService } from 'core/telemetry'
import { Hooks, HookService } from 'core/user-code'
import { WorkspaceService } from 'core/users'
import { WrapErrorsWith } from 'errors'
import fse from 'fs-extra'
import glob from 'glob'
import { inject, injectable, postConstruct, tagged } from 'inversify'
import Joi from 'joi'
import _, { merge } from 'lodash'
import moment from 'moment'
import ms from 'ms'
import { studioActions } from 'orchestrator'
import os from 'os'
import path from 'path'
import replace from 'replace-in-file'
import tmp from 'tmp'
import { VError } from 'verror'
import axios from 'axios'
import zlib from 'zlib'

const BOT_DIRECTORIES = ['actions', 'flows', 'entities', 'content-elements', 'intents', 'qna']
const BOT_CONFIG_FILENAME = 'bot.config.json'
const REVISIONS_DIR = './revisions'
const BOT_ID_PLACEHOLDER = '/bots/BOT_ID_PLACEHOLDER/'
const REV_SPLIT_CHAR = '++'
const MAX_REV = 10
const DEFAULT_BOT_CONFIGS = {
  locked: false,
  disabled: false,
  private: false,
  details: {}
}

const STATUS_REFRESH_INTERVAL = ms('15s')
const STATUS_EXPIRY = ms('20s')
const DEFAULT_BOT_HEALTH: BotHealth = { status: 'disabled', errorCount: 0, warningCount: 0, criticalCount: 0 }

const getBotStatusKey = (serverId: string) => makeRedisKey(`bp_server_${serverId}_bots`)
const debug = DEBUG('services:bots')

@injectable()
export class BotService {
  public mountBot: Function = this._localMount
  public unmountBot: Function = this._localUnmount
  public syncLibs: Function = this._localSyncLibs

  private _botIds: string[] | undefined
  private static _mountedBots: Map<string, boolean> = new Map()
  private static _botHealth: { [botId: string]: BotHealth } = {}
  private _updateBotHealthDebounce = _.debounce(this._updateBotHealth, 500)
  public dummyBot = ''

  // Add static properties for global access
  public static fullName: string | undefined
  public static organisationName: string | undefined

  constructor(
    @inject(TYPES.Logger)
    @tagged('name', 'BotService')
    private logger: Logger,
    @inject(TYPES.ConfigProvider) private configProvider: ConfigProvider,
    @inject(TYPES.CMSService) private cms: CMSService,
    @inject(TYPES.GhostService) private ghostService: GhostService,
    @inject(TYPES.HookService) private hookService: HookService,
    @inject(TYPES.ModuleLoader) private moduleLoader: ModuleLoader,
    @inject(TYPES.JobService) private jobService: JobService,
    @inject(TYPES.Statistics) private stats: AnalyticsService,
    @inject(TYPES.WorkspaceService) private workspaceService: WorkspaceService,
    @inject(TYPES.MessagingService) private messagingService: MessagingService
  ) {
    this._botIds = undefined
  }

  @postConstruct()
  async init() {
    this.mountBot = await this.jobService.broadcast<void>(this._localMount.bind(this))
    this.unmountBot = await this.jobService.broadcast<void>(this._localUnmount.bind(this))
    this.syncLibs = await this.jobService.broadcast<void>(this._localSyncLibs.bind(this))

    if (!cluster.isMaster) {
      setInterval(() => this._updateBotHealthDebounce(), STATUS_REFRESH_INTERVAL)
    }
  }

  async findBotById(botId: string): Promise<BotConfig | undefined> {
    if (!(await this.ghostService.forBot(botId).fileExists('/', 'bot.config.json'))) {
      this.logger.forBot(botId).warn(`Bot '${botId}' not found. Make sure it exists on your filesystem or database.`)
      return
    }

    return this.configProvider.getBotConfig(botId)
  }

  async findBotsByIds(botsIds: string[]): Promise<BotConfig[]> {
    const actualBotsIds = await this.getBotsIds()
    const unlinkedBots = _.difference(actualBotsIds, botsIds)
    const linkedBots = _.without(actualBotsIds, ...unlinkedBots)
    const botConfigs: BotConfig[] = []

    for (const botId of linkedBots) {
      const config = await this.findBotById(botId)
      config && botConfigs.push(config)
    }

    return botConfigs
  }

  async getBots(): Promise<Map<string, BotConfig>> {
    const botIds = await this.getBotsIds()
    const bots = new Map<string, BotConfig>()

    for (const botId of botIds) {
      try {
        const bot = await this.findBotById(botId)
        bot && bots.set(botId, bot)
      } catch (err) {
        this.logger
          .forBot(botId)
          .attachError(err)
          .error(`Bot configuration file not found for bot '${botId}'`)
      }
    }

    return bots
  }

  async getBotsIds(ignoreCache?: boolean): Promise<string[]> {
    if (!this._botIds || ignoreCache) {
      this._botIds = (await this.ghostService.bots().directoryListing('/', BOT_CONFIG_FILENAME)).map(path.dirname)
    }

    return this._botIds
  }

  async makeBotId(botId: string, workspaceId: string) {
    const workspace = await this.workspaceService.findWorkspace(workspaceId)
    return workspace?.botPrefix ? `${workspace.botPrefix}__${botId}` : botId
  }

  async addBot(bot: BotConfig, botTemplate: BotTemplate, source: BotConfig, desc: BotConfig, email: any, fullName: any, organisationName: any): Promise<void> {
    this.stats.track('bot', 'create')

    const { error } = Joi.validate(bot, BotCreationSchema)
    if (error) {
      throw new InvalidOperationError(`An error occurred while creating the bot: ${error.message}`)
    }

    // Save fullName and organizationName globally
    BotService.fullName = fullName
    BotService.organisationName = organisationName

    let mergedConfigs
    if (source.from == 'llm') {
      mergedConfigs = await this._createBotFromLLM(bot, desc.botDesc!)
    }
    else {
      mergedConfigs = await this._createBotFromTemplate(bot, botTemplate, email)
    }

    if (mergedConfigs) {
      if (!mergedConfigs.disabled) {
        await this.mountBot(bot.id)
        await this.cms.translateContentProps(bot.id, undefined, mergedConfigs.defaultLanguage)
      }
      this._invalidateBotIds()
    }
  }

  async getAndLoadUserBots(email: any) {
    try {
      let result = await axios('https://www.app.xmati.ai/apis/get-bots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: JSON.stringify({
          email
        }),
      })

      result = result.data

      const botIds: string[] = [];

      for (const botRecord of result.data) {
        try {
          // Directly use the data from the response (no decompression needed)
          const botConfig = botRecord.data;

          // Extract bot ID from key
          const botId = botRecord.key.toString().split('_')[1];

          // Process and save the bot files
          const files = await this._parseBotFiles(JSON.parse(botConfig));
          await this._saveFiles(botId, files);
          await this.mountBot(botId);

          botIds.push(botId);
        } catch (error) {
          console.error(`Error processing bot with key ${botRecord.key}:`, error);
          // Continue processing other bots even if one fails
        }
      }

      return botIds;
    } catch (error) {
      console.log('Something went wrong in get bots', error)
      return false;
    }
  }

  async getAndLoadAllBots() {
    try {
      let result = await axios('https://www.app.xmati.ai/apis/get-all-bots', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      result = result.data

      const botIds: string[] = [];

      for (const botRecord of result.data) {
        try {
          // Directly use the data from the response (no decompression needed)
          const botConfig = botRecord.data;

          // Extract bot ID from key
          const botId = botRecord.key.toString().split('_')[1];

          // Process and save the bot files
          const files = await this._parseBotFiles(JSON.parse(botConfig));
          await this._saveFiles(botId, files);
          await this.mountBot(botId);

          botIds.push(botId);
        } catch (error) {
          console.error(`Error processing bot with key ${botRecord.key}:`, error);
          // Continue processing other bots even if one fails
        }
      }

      return botIds;
    } catch (error) {
      console.log('Something went wrong in get bots', error)
      return false;
    }
  }

  async saveAllBots(keys) {
    keys.forEach(async (key) => {
      await this._convertBot(`${key.owner}_${key.id}`, key.id, 'admin')
    })
  }

  async updateBot(botId: string, updatedBot: Partial<BotConfig>): Promise<void> {
    this.stats.track('bot', 'update')

    const { error } = Joi.validate(updatedBot, BotEditSchema)
    if (error) {
      throw new InvalidOperationError(`An error occurred while updating the bot: ${error.message}`)
    }

    if (!(await this.botExists(botId))) {
      throw new Error(`Bot '${botId}' doesn't exist`)
    }

    if (!process.IS_PRO_ENABLED && updatedBot.languages && updatedBot.languages.length > 1) {
      throw new Error('A single language is allowed on community edition.')
    }

    const actualBot = await this.configProvider.getBotConfig(botId)
    const updatedFields = _.pick(updatedBot, [
      'name',
      'description',
      'category',
      'details',
      'disabled',
      'private',
      'defaultLanguage',
      'languages',
      'locked'
    ]) as Partial<BotConfig>

    // bot needs to be mounted to perform the language changes
    if (updatedFields.defaultLanguage && updatedFields.defaultLanguage !== actualBot.defaultLanguage) {
      updatedFields.disabled = false
    }

    const newConfig = {
      ...actualBot,
      ...updatedFields
    } as BotConfig

    if (!newConfig.languages.includes(newConfig.defaultLanguage)) {
      throw new Error('Supported languages must include the default language of the bot')
    }

    await this.configProvider.setBotConfig(botId, newConfig)

    if (!updatedBot.disabled) {
      if (this.isBotMounted(botId)) {
        // we need to remount the bot to update the config
        await this.unmountBot(botId)
      }

      await this.mountBot(botId)
    }

    if (actualBot.defaultLanguage !== updatedBot.defaultLanguage) {
      await this.cms.translateContentProps(botId, actualBot.defaultLanguage, updatedBot.defaultLanguage!)
    }

    // This will regenerate previews for all the bot's languages
    if (actualBot.languages !== updatedBot.languages) {
      await this.cms.recomputeElementsForBot(botId)
    }

    if (!actualBot.disabled && updatedBot.disabled) {
      await this.unmountBot(botId)
    }
  }

  async exportBot(botId: string): Promise<Buffer> {
    const replaceContent: ReplaceContent = {
      from: [new RegExp(`/bots/${botId}/`, 'g')],
      to: [BOT_ID_PLACEHOLDER]
    }

    return this.ghostService
      .forBot(botId)
      .exportToArchiveBuffer(['models/**/*', 'libraries/node_modules/**/*'], replaceContent)
  }

  async importBot(botData: any, archive: Buffer, workspaceId: string, allowOverwrite?: boolean): Promise<void> {
    const botId = botData.oldBotId;
    const newBotId = botData.newBotId;
    const email = botData.email;


    const startTime = Date.now()
    if (!isValidBotId(newBotId)) {         // newBotId
      throw new InvalidOperationError('Cant import bot the bot ID contains invalid characters')
    }

    // if (await this.botExists(newBotId)) {      // newBotId
    //   if (!allowOverwrite) {
    //     throw new InvalidOperationError(
    //       `Cannot import the bot ${newBotId}, it already exists, and overwriting is not allowed`
    //     )
    //   } else {
    //     this.logger
    //       .forBot(newBotId)
    //       .warn(`The bot ${newBotId} already exists, files in the archive will overwrite existing ones`)
    //   }
    // }
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const tmpFolder = tmpDir.name

    try {
      await extractArchive(archive, tmpFolder)
      const api = await createForGlobalHooks()

      const hookResult = {
        allowImport: true
      }

      await this.hookService.executeHook(new Hooks.BeforeBotImport(api, newBotId, tmpFolder, hookResult))    //  // newBotId

      if (hookResult.allowImport) {

        const pipeline = await this.workspaceService.getPipeline(workspaceId)

        await replace({
          files: `${tmpDir.name}/**/*.json`,
          from: new RegExp(BOT_ID_PLACEHOLDER, 'g'),
          to: `/bots/${newBotId}/`                              // newBotId
        })

        const folder = await this._validateBotArchive(tmpDir.name)

        // Check for deleted file upon overwriting
        if (allowOverwrite) {
          const files = await this.ghostService.forBot(newBotId).directoryListing('/')        // newBotId
          const deletedFiles = await findDeletedFiles(files, folder)
          for (const file of deletedFiles) {
            await this.ghostService.forBot(newBotId).deleteFile('/', file)              // newBotId
          }
        }

        if (await this.botExists(newBotId)) {           // newBotId
          await this.unmountBot(newBotId)                // newBotId
        }

        await this.ghostService.forBot(newBotId).importFromDirectory(folder)

        // Load the bot.config.json from the extracted archive
        const configFilePath = path.join(folder, 'bot.config.json');
        if (!(await fse.pathExists(configFilePath))) {
          throw new Error(`Configuration file "bot.config.json" not found in the archive for botId: ${newBotId}`);
        }

        const originalConfig = JSON.parse(await fse.readFile(configFilePath, 'utf-8'));      // oldBotId
        const newConfigs = <Partial<BotConfig>>{
          id: newBotId,                                                           // newBotId
          name: `${originalConfig.name}`,
          owner: (email === '-') ? originalConfig.owner : email,
          pipeline_status: {
            current_stage: {
              id: pipeline && pipeline[0].id,
              promoted_by: 'system',
              promoted_on: new Date()
            }
          }
        }
        await this.configProvider.mergeBotConfig(newBotId, newConfigs, true)      // newBotId

        await this.workspaceService.addBotRef(newBotId, workspaceId)              // newBotId

        await studioActions.checkBotMigrations(newBotId)                          // newBotId

        if (!originalConfig.disabled) {
          if (!(await this.mountBot(newBotId))) {                  // newBotId
            this.logger.forBot(newBotId).warn(`Import of bot ${newBotId} completed, but it couldn't be mounted`)   // newBotId
            return
          }
        } else {
          BotService.setBotStatus(newBotId, 'disabled')        // newBotId
        }


        await this._convertBot(`${(email === '-') ? originalConfig.owner : email}_${newBotId}`, newBotId)
        this.logger.forBot(botId).info(`Import of bot ${newBotId} successful`)       // newBotId
      } else {
        this.logger.forBot(newBotId).info(`Import of bot ${newBotId} was denied by hook validation`)    // newBotId
      }

    } finally {
      this._invalidateBotIds()
      tmpDir.removeCallback()
      debug.forBot(newBotId, `Bot import took ${Date.now() - startTime}ms`)     // newBotId
    }
  }

  private async _validateBotArchive(directory: string): Promise<string> {
    const configFile = await Promise.fromCallback<string[]>(cb => glob('**/bot.config.json', { cwd: directory }, cb))
    if (configFile.length > 1) {
      throw new InvalidOperationError('Bots must be imported in separate archives')
    } else if (configFile.length !== 1) {
      throw new InvalidOperationError('The archive doesnt seem to contain a bot')
    }

    return path.join(directory, path.dirname(configFile[0]))
  }

  async requestStageChange(botId: string, requestedBy: string) {
    const botConfig = (await this.findBotById(botId)) as BotConfig
    if (!botConfig) {
      throw Error('bot does not exist')
    }

    const workspaceId = await this.workspaceService.getBotWorkspaceId(botId)
    const pipeline = await this.workspaceService.getPipeline(workspaceId)
    if (!pipeline) {
      return
    }

    const nextStageIdx = pipeline.findIndex(s => s.id === botConfig.pipeline_status.current_stage.id) + 1
    if (nextStageIdx >= pipeline.length) {
      this.logger.debug('end of pipeline')
      return
    }

    const stage_request = {
      id: pipeline[nextStageIdx].id,
      status: 'pending',
      requested_on: new Date(),
      requested_by: requestedBy
    }

    const newConfig = await this.configProvider.mergeBotConfig(botId, { pipeline_status: { stage_request } })
    await this._executeStageChangeHooks(botConfig, newConfig)
  }

  async approveStageChange(botId: string, requestedBy: string, userStrategy: string) {
    const botConfig = (await this.findBotById(botId)) as BotConfig
    if (!botConfig) {
      throw Error('bot does not exist')
    }
    if (!botConfig.pipeline_status!.stage_request) {
      throw Error('bot does not have a stage request')
    }

    const workspaceId = await this.workspaceService.getBotWorkspaceId(botId)
    const pipeline = await this.workspaceService.getPipeline(workspaceId)
    if (!pipeline) {
      return
    }

    const approvals = botConfig.pipeline_status.stage_request?.approvals || []
    if (!approvals.find(a => a.email === requestedBy && a.strategy === userStrategy)) {
      approvals.push({ email: requestedBy, strategy: userStrategy })
    }

    const newConfig = await this.configProvider.mergeBotConfig(botId, {
      pipeline_status: { stage_request: { approvals } }
    })
    await this._executeStageChangeHooks(botConfig, newConfig)
  }

  async duplicateBot(sourceBotId: string, destBotId: string) {
    if (!(await this.botExists(sourceBotId))) {
      throw new Error('Source bot does not exist')
    }
    if (sourceBotId === destBotId) {
      throw new Error('New bot id needs to differ from original bot')
    }

    const sourceGhost = this.ghostService.forBot(sourceBotId)
    const destGhost = this.ghostService.forBot(destBotId)
    const botContent = await sourceGhost.directoryListing('/')
    await Promise.all(
      botContent.map(async file => destGhost.upsertFile('/', file, await sourceGhost.readFileAsBuffer('/', file)))
    )
    await studioActions.invalidateCmsForBot(destBotId)
    const workspaceId = await this.workspaceService.getBotWorkspaceId(sourceBotId)
    await this.workspaceService.addBotRef(destBotId, workspaceId)
  }

  public async botExists(botId: string, ignoreCache?: boolean): Promise<boolean> {
    return (await this.getBotsIds(ignoreCache)).includes(botId)
  }

  private async _executeStageChangeHooks(beforeRequestConfig: BotConfig, currentConfig: BotConfig) {
    const workspaceId = await this.workspaceService.getBotWorkspaceId(currentConfig.id)
    const pipeline = await this.workspaceService.getPipeline(workspaceId)
    if (!pipeline) {
      return
    }

    const bpConfig = await this.configProvider.getBotpressConfig()
    const alteredBot = _.cloneDeep(currentConfig)

    const options = { attributes: ['last_logon', 'firstname', 'lastname'] }
    const users = (await this.workspaceService.getWorkspaceUsers(workspaceId, options)) as WorkspaceUserWithAttributes[]

    const api = await createForGlobalHooks()
    const currentStage = <Stage>pipeline.find(s => s.id === currentConfig.pipeline_status.current_stage.id)
    const hookResult = {
      actions: [currentStage.action]
    }

    await this.hookService.executeHook(new Hooks.OnStageChangeRequest(api, alteredBot, users, pipeline, hookResult))
    if (_.isArray(hookResult.actions)) {
      await Promise.map(hookResult.actions, async action => {
        if (bpConfig.autoRevision && (await this.botExists(alteredBot.id))) {
          await this.createRevision(alteredBot.id)
        }
        if (action === 'promote_copy') {
          return this._promoteCopy(currentConfig, alteredBot)
        } else if (action === 'promote_move') {
          return this._promoteMove(currentConfig, alteredBot)
        }
      })
    }
    // stage has changed
    if (currentConfig.pipeline_status.current_stage.id !== alteredBot.pipeline_status.current_stage.id) {
      await this.hookService.executeHook(
        new Hooks.AfterStageChanged(api, beforeRequestConfig, alteredBot, users, pipeline)
      )
      if (bpConfig.autoRevision) {
        await this.createRevision(alteredBot.id)
      }
    }
  }

  private async _promoteMove(bot: BotConfig, finalBot: BotConfig) {
    finalBot.pipeline_status.current_stage = {
      id: finalBot.pipeline_status.stage_request!.id,
      promoted_by: finalBot.pipeline_status.stage_request!.requested_by,
      promoted_on: new Date()
    }
    delete finalBot.pipeline_status.stage_request
    if (bot.id === finalBot.id) {
      return this.configProvider.setBotConfig(bot.id, finalBot)
    }

    await this.configProvider.setBotConfig(bot.id, finalBot)
    await this.duplicateBot(bot.id, finalBot.id)

    await this.mountBot(finalBot.id)

    await this.deleteBot(bot.id)
  }

  private async _promoteCopy(initialBot: BotConfig, newBot: BotConfig) {
    if (initialBot.id === newBot.id) {
      newBot.id = `${newBot.id}__${moment().format('YY-MM-DD')}__${Math.round(Math.random() * 100)}`
    }

    newBot.pipeline_status.current_stage = {
      id: newBot.pipeline_status.stage_request!.id,
      promoted_by: newBot.pipeline_status.stage_request!.requested_by,
      promoted_on: new Date()
    }
    delete newBot.pipeline_status.stage_request

    try {
      await this.duplicateBot(initialBot.id, newBot.id)

      await this.configProvider.setBotConfig(newBot.id, newBot)
      await this.mountBot(newBot.id)

      delete initialBot.pipeline_status.stage_request
      return this.configProvider.setBotConfig(initialBot.id, initialBot)
    } catch (err) {
      this.logger
        .forBot(newBot.id)
        .attachError(err)
        .error(`Error trying to 'promote_copy' bot : ${initialBot.id}`)
    }
  }

  @WrapErrorsWith(args => `Could not delete bot '${args[0]}'`, { hideStackTrace: true })
  async deleteBot(botId: string) {
    this.stats.track('bot', 'delete')

    if (!(await this.botExists(botId))) {
      throw new Error(`Bot '${botId}' doesn't exist`)
    }

    await this.unmountBot(botId)
    await this._cleanupRevisions(botId, true)
    await this.ghostService.forBot(botId).deleteFolder('/')
    this._invalidateBotIds()
  }

  async deleteFromS3(key: string, fullName: string) {
    try {
      const result = await axios('https://www.app.xmati.ai/apis/delete-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          fullName: fullName,
          key,
        },
      })

      console.log(result.data);
    } catch (error) {
      console.error('Error deleting from S3:', error);
    }
  }

  public async getBotTemplate(moduleId: string, templateId: string): Promise<FileContent[]> {
    const resourceLoader = new ModuleResourceLoader(this.logger, moduleId, this.ghostService)
    const templatePath = await resourceLoader.getBotTemplatePath(templateId)

    return this._loadBotTemplateFiles(templatePath)
  }

  private async _serializeFolder(location: any = '../kbot2') {
    let result = ''

    function getFiles(dir: string): string[] {
      let fileList: string[] = []
      const items = fse.readdirSync(dir, { withFileTypes: true })

      for (const item of items) {
        const fullPath = path.join(dir, item.name)
        if (item.isDirectory()) {
          fileList = fileList.concat(getFiles(fullPath)) // Recursively get files
        } else {
          fileList.push(fullPath)
        }
      }
      return fileList
    }

    const files = getFiles(location)

    location = (location === '../kbot') ? 'kbot/' : `${location.split('./')[1]}/`

    files.forEach(filePath => {
      const fileName = path.basename(filePath)
      // if (fileName === 'bot.config.json') return // Omit bot.config.json

      if (fse.statSync(filePath).isFile()) {
        const content = fse.readFileSync(filePath, 'utf-8')
        filePath = filePath.replace(location, '')
        result += `**Folder**: ${filePath}\n\`\`\`json\n${content}\n\`\`\`\n\n`
      }
    })

    //console.log('result: ', result);
    return result
  }


  private async _generateBot(id, owner, botDesc, mergedConfigs) {
    // DeepSeek API configuration (replace with actual API details)
    const DEEPSEEK_API_KEY = 'sk-d8088cbc82a046ccbf22716dd1c74af1'
    const API_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions'
    //const API_ENDPOINT = 'https://www.app.xmati.ai/apis/gemini-llm'

    const dummyBot = await this._serializeFolder()

    try {
      //1. Call DeepSeek API
      const response = await axios.post(API_ENDPOINT, {
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `
          Generate Botpress files for: ${botDesc}. 
          Here is an example bot structure: ${dummyBot}
          Analyze this folder structure and provide the response strictly according to the dummy structure provided.
          some files have flow and ui json, please dont ignore any.
          Format response with code blocks like:
          **Folder**: flows/main.flow.json
          \`\`\`json
          { ... }
          \`\`\`
          `}],
        temperature: 0.7
      }, {
        headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}` }
      })
      // const botContent = await axios(API_ENDPOINT, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   data: {
      //     prompt: `
      //     Generate Botpress files for: ${botDesc}. 
      //     Here is an example bot structure: ${dummyBot}
      //     Analyze this folder structure and provide the response strictly according to the dummy structure provided.
      //     some files have flow and ui json, please dont ignore any.
      //     Format response with code blocks like:
      //     **Folder**: flows/main.flow.json
      //     \`\`\`json
      //     { ... }
      //     \`\`\` .
      //     Please provide only the above response and not any explaination `,
      //   },
      // })

      // 2. Parse API response
      const botContent = response.data.choices[0].message.content
      //console.log(botContent)

      // 3. Extract files from response
      const files = this._parseBotFiles(botContent)

      // 4. Save to folders
      await this._saveFilesWithConfig(id, files, mergedConfigs, owner)

      console.log(`Bot generated successfully! ${files.length} files created.`)

    } catch (error) {
      console.error('Error:', error.response?.data || error.message)
    }
  }

  // Helper: Extract files from API response
  private _parseBotFiles(text) {
    const fileRegex = /\*\*Folder\*\*: (.*?)\s*```json\s*\n([\s\S]*?)\n```/g
    const files: any = []
    let match

    while ((match = fileRegex.exec(text)) !== null) {
      files.push({
        name: match[1].trim(),
        content: match[2].trim()
      })
    }

    return files
  }

  // Helper: Save files to disk
  private async _saveFiles(id, files) {
    const scopedGhost = this.ghostService.forBot(id)
    await scopedGhost.upsertFiles('/', files, { ignoreLock: true })

    // const baseDirectory = path.resolve(`./data/bots`)
    // Write files
    // await Promise.all(files.map(file =>
    //   fse.writeFile(
    //     path.join(baseDirectory, botName, file.name),
    //     file.content
    //   )))
  }

  // Helper: Save files to disk
  private async _saveFilesWithConfig(id, files, mergedConfigs, owner) {
    const scopedGhost = this.ghostService.forBot(id)
    await scopedGhost.upsertFiles('/', files, { ignoreLock: true })
    await scopedGhost.upsertFile('/', BOT_CONFIG_FILENAME, stringify(mergedConfigs))
    this._convertBot(`${owner}_${id}`, id);
  }

  private async _convertBot(key, id, from = 'user') {
    const botFile = await this._serializeFolder(`./data/bots/${id}`)
    await this._saveData(key, botFile, from)
  }

  private async _createBotFromLLM(botConfig: BotConfig, botDesc: string) {
    const resourceLoader = new ModuleResourceLoader(this.logger, 'builtin', this.ghostService)
    const templatePath = await resourceLoader.getBotTemplatePath('empty-bot')
    const templateConfigPath = path.resolve(templatePath, BOT_CONFIG_FILENAME)

    try {
      const scopedGhost = this.ghostService.forBot(botConfig.id)
      const files = this._loadBotTemplateFiles(templatePath)

      if (fse.existsSync(templateConfigPath)) {
        const templateConfig = JSON.parse(await fse.readFile(templateConfigPath, 'utf-8'))
        const mergedConfigs = {
          ...DEFAULT_BOT_CONFIGS,
          ...templateConfig,
          ...botConfig,
          version: process.BOTPRESS_VERSION
        }

        if (!mergedConfigs.imports.contentTypes) {
          const allContentTypes = await this.cms.getAllContentTypes()
          mergedConfigs.imports.contentTypes = allContentTypes.map(x => x.id)
        }

        if (!mergedConfigs.defaultLanguage) {
          mergedConfigs.disabled = true
        }

        // create bot folder and subsequent sub folders
        await scopedGhost.ensureDirs('/', BOT_DIRECTORIES)
        await scopedGhost.upsertFile('/', BOT_CONFIG_FILENAME, stringify(mergedConfigs))
        await scopedGhost.upsertFiles('/', files, { ignoreLock: true })

        // create skills folder inside 'flows' subdirectory
        // const baseDirectory = path.resolve(`./data/bots/${botConfig.name}/flows`)
        // const botFolderPath = path.join(baseDirectory, 'skills')

        // try {
        //   await fse.ensureDir(botFolderPath)
        // } catch (error) {
        //   console.error('Error creating skills folders:', error)
        // }
        await this._generateBot(botConfig.id, botConfig.owner, botDesc, mergedConfigs)

        return mergedConfigs
      }
      else {
        throw new Error('Something went wrong while creating botConfig file')
      }
    } catch (err) {
      this.logger
        .forBot(botConfig.id)
        .attachError(err)
        .error(`Error creating bot ${botConfig.id} from LLM`)
    }
  }

  private async _createBotFromTemplate(botConfig: BotConfig, template: BotTemplate, email: any): Promise<BotConfig | undefined> {
    const resourceLoader = new ModuleResourceLoader(this.logger, template.moduleId!, this.ghostService)
    const templatePath = await resourceLoader.getBotTemplatePath(template.id)
    const templateConfigPath = path.resolve(templatePath, BOT_CONFIG_FILENAME)


    try {
      const scopedGhost = this.ghostService.forBot(botConfig.id)
      const files = this._loadBotTemplateFiles(templatePath)
      if (fse.existsSync(templateConfigPath)) {
        const templateConfig = JSON.parse(await fse.readFile(templateConfigPath, 'utf-8'))
        const mergedConfigs = {
          ...DEFAULT_BOT_CONFIGS,
          ...templateConfig,
          ...botConfig,
          version: process.BOTPRESS_VERSION
        }

        if (!mergedConfigs.imports.contentTypes) {
          const allContentTypes = await this.cms.getAllContentTypes()
          mergedConfigs.imports.contentTypes = allContentTypes.map(x => x.id)
        }

        if (!mergedConfigs.defaultLanguage) {
          mergedConfigs.disabled = true
        }

        await scopedGhost.ensureDirs('/', BOT_DIRECTORIES)
        await scopedGhost.upsertFile('/', BOT_CONFIG_FILENAME, stringify(mergedConfigs))
        await scopedGhost.upsertFiles('/', files, { ignoreLock: true })
        await this._convertBot(`${email}_${botConfig.id}`, botConfig.id);

        return mergedConfigs
      } else {
        throw new Error('Bot template doesnt exist')
      }
    } catch (err) {
      this.logger
        .forBot(botConfig.id)
        .attachError(err)
        .error(`Error creating bot ${botConfig.id} from template '${template.name}'`)
    }
  }

  private _saveData = async (key, data, from = 'user') => {
    try {
      //const compressedData = await this._compressRequest(data);
      const result = await axios('https://www.app.xmati.ai/apis/save-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          fullName: BotService.fullName,
          organizationName: BotService.organisationName,
          key,
          data: data,
          from
        },
      })

      console.log(result.data);
    } catch (error) {
      console.log('error:- ', error)
      return { success: false, msg: 'Error uploading credentials to S3' }
    }
  }

  // Compress the request body
  // private async _compressRequest(data) {
  //   return new Promise((resolve, reject) => {
  //     zlib.gzip(JSON.stringify(data), (err, compressed) => {
  //       if (err) reject(err);
  //       else resolve(compressed);
  //     });
  //   });
  // };

  // // Decompress the response body
  // private async _decompressResponse(buffer) {
  //   try {
  //     const decompressed = zlib.gunzipSync(buffer);
  //     //console.log('Decompressed data:', decompressed.toString('utf-8'));
  //     return decompressed.toString('utf-8');
  //   } catch (err) {
  //     console.error('Decompression failed:', err.message);
  //     return false;
  //   }
  //   // return new Promise((resolve, reject) => {
  //   //   zlib.gunzip(buffer, (err, decompressed) => {
  //   //     if (err) reject(err);
  //   //     else resolve(JSON.parse(decompressed.toString()));
  //   //   });
  //   // });
  // };


  private _loadBotTemplateFiles(templatePath: string): FileContent[] {
    const startsWithADot = /^\./gm
    const templateFiles = listDir(templatePath, [startsWithADot, new RegExp(BOT_CONFIG_FILENAME)])
    return templateFiles.map(
      f =>
        <FileContent>{
          name: f.relativePath,
          content: fse.readFileSync(f.absolutePath)
        }
    )
  }

  public isBotMounted(botId: string): boolean {
    return BotService._mountedBots.get(botId) || false
  }

  private async _localSyncLibs(botId: string, serverId: string) {
    // We do not need to extract the archive on the server which just generated it
    if (process.SERVER_ID !== serverId) {
      await this._extractBotNodeModules(botId)
    }
  }

  private async _extractBotNodeModules(botId: string) {
    const bpfs = this.ghostService.forBot(botId)
    if (!(await bpfs.fileExists('libraries', 'node_modules.tgz'))) {
      return
    }

    try {
      const archive = await bpfs.readFileAsBuffer('libraries', 'node_modules.tgz')
      const destPath = path.join(process.PROJECT_LOCATION, 'data/bots', botId, 'libraries/node_modules')
      await extractArchive(archive, destPath)
    } catch (err) {
      this.logger.attachError(err).error('Error extracting node modules')
    }
  }

  private async _extractLibsToDisk(botId: string) {
    if (process.BPFS_STORAGE === 'disk') {
      return
    }

    await this.ghostService.forBot(botId).syncDatabaseFilesToDisk('libraries')
    await this.ghostService.forBot(botId).syncDatabaseFilesToDisk('actions')
    await this.ghostService.forBot(botId).syncDatabaseFilesToDisk('hooks')
  }

  // Do not use directly use the public version instead due to broadcasting
  private async _localMount(botId: string): Promise<boolean> {
    const startTime = Date.now()

    if (!(await this.ghostService.forBot(botId).fileExists('/', 'bot.config.json'))) {
      this.logger
        .forBot(botId)
        .error(`Cannot mount bot '${botId}'.Make sure it exists on the filesystem or the database.`)
      return false
    }

    try {
      const config = await this.configProvider.getBotConfig(botId)
      if (!config.languages.includes(config.defaultLanguage)) {
        throw new Error('Supported languages must include the default language of the bot')
      }

      const botpressConfig = await this.configProvider.getBotpressConfig()
      if (ms(botpressConfig.dialog.sessionTimeoutInterval) < ms(config.dialog?.timeoutInterval || '0s')) {
        this.logger
          .forBot(botId)
          .warn(
            `[${botId}]Your timeout interval(source: bot.config) is greater than your session timeout(source: botpress.config).This will prevent 'before_session_timeout' hooks and Timeout flows from being executed.`
          )
      }

      await this.messagingService.lifetime.loadMessagingForBot(botId)
      await this.cms.loadElementsForBot(botId)
      await this.moduleLoader.loadModulesForBot(botId)

      await this._extractLibsToDisk(botId)
      await this._extractBotNodeModules(botId)

      const api = await createForGlobalHooks()
      await this.hookService.executeHook(new Hooks.AfterBotMount(api, botId))
      BotService._mountedBots.set(botId, true)
      await studioActions.setBotMountStatus(botId, true)

      this._invalidateBotIds()

      BotService.setBotStatus(botId, 'healthy')
      return true
    } catch (err) {
      this.logger
        .forBot(botId)
        .attachError(err)
        .critical(`Cannot mount bot '${botId}'`)

      return false
    } finally {
      await this._updateBotHealthDebounce()
      debug.forBot(botId, `Mount took ${Date.now() - startTime}ms`)
    }
  }

  // Do not use directly use the public version instead due to broadcasting
  private async _localUnmount(botId: string) {
    const startTime = Date.now()
    if (!this.isBotMounted(botId)) {
      this._invalidateBotIds()
      return
    }

    await this.cms.clearElementsFromCache(botId)
    await this.moduleLoader.unloadModulesForBot(botId)
    await this.messagingService.lifetime.unloadMessagingForBot(botId)

    const api = await createForGlobalHooks()
    await this.hookService.executeHook(new Hooks.AfterBotUnmount(api, botId))

    BotService._mountedBots.set(botId, false)
    await studioActions.setBotMountStatus(botId, false)
    BotService.setBotStatus(botId, 'disabled')

    await this._updateBotHealthDebounce()
    this._invalidateBotIds()
    debug.forBot(botId, `Unmount took ${Date.now() - startTime}ms`)
  }

  private _invalidateBotIds(): void {
    this._botIds = undefined
  }

  public static getMountedBots() {
    const bots: string[] = []
    BotService._mountedBots.forEach((isMounted, bot) => isMounted && bots.push(bot))
    return bots
  }

  public async listRevisions(botId: string): Promise<string[]> {
    const globalGhost = this.ghostService.global()
    if (!(await this.botExists(botId))) {
      throw new Error(`Bot '${botId}' doesn't exist`)
    }

    const workspaceId = await this.workspaceService.getBotWorkspaceId(botId)

    let stageID = ''
    if (await this.workspaceService.hasPipeline(workspaceId)) {
      const botConfig = await this.configProvider.getBotConfig(botId)
      stageID = botConfig.pipeline_status.current_stage.id
    }

    const revisions = await globalGhost.directoryListing(REVISIONS_DIR, '*.tgz')
    return revisions
      .filter(rev => rev.startsWith(`${botId}${REV_SPLIT_CHAR}`) && rev.includes(stageID))
      .sort((revA, revB) => {
        const dateA = revA.split(REV_SPLIT_CHAR)[1].replace(/\.tgz$/i, '')
        const dateB = revB.split(REV_SPLIT_CHAR)[1].replace(/\.tgz$/i, '')

        return parseInt(dateA, 10) - parseInt(dateB, 10)
      })
  }

  public async createRevision(botId: string): Promise<void> {
    if (!(await this.botExists(botId))) {
      throw new Error(`Bot '${botId}' doesn't exist`)
    }

    const workspaceId = await this.workspaceService.getBotWorkspaceId(botId)
    let revName = botId + REV_SPLIT_CHAR + Date.now()

    if (await this.workspaceService.hasPipeline(workspaceId)) {
      const botConfig = await this.configProvider.getBotConfig(botId)
      revName = revName + REV_SPLIT_CHAR + botConfig.pipeline_status.current_stage.id
    }

    const botGhost = this.ghostService.forBot(botId)
    const globalGhost = this.ghostService.global()
    await globalGhost.upsertFile(REVISIONS_DIR, `${revName}.tgz`, await botGhost.exportToArchiveBuffer('models/**/*'))
    return this._cleanupRevisions(botId)
  }

  public async rollback(botId: string, revision: string): Promise<void> {
    if (!(await this.botExists(botId))) {
      throw new Error(`Bot '${botId}' doesn't exist`)
    }

    const workspaceId = await this.workspaceService.getBotWorkspaceId(botId)
    const revParts = revision.replace(/\.tgz$/i, '').split(REV_SPLIT_CHAR)
    if (revParts.length < 2) {
      throw new VError('invalid revision')
    }

    if (revParts[0] !== botId) {
      throw new VError('cannot rollback a bot with a different Id')
    }

    if (await this.workspaceService.hasPipeline(workspaceId)) {
      const botConfig = await this.configProvider.getBotConfig(botId)
      if (revParts.length < 3 || revParts[2] !== botConfig.pipeline_status.current_stage.id) {
        throw new VError('cannot rollback a bot to a different stage')
      }
    }

    const revArchive = await this.ghostService.global().readFileAsBuffer(REVISIONS_DIR, revision)
    const tmpDir = tmp.dirSync({ unsafeCleanup: true })
    const tmpFolder = tmpDir.name

    try {
      await extractArchive(revArchive, tmpFolder)
      await this.unmountBot(botId)
      await this.ghostService.forBot(botId).deleteFolder('/')
      await this.ghostService.forBot(botId).importFromDirectory(tmpDir.name)
      await this.mountBot(botId)
      this.logger.forBot(botId).info(`Rollback of bot ${botId} successful`)
    } finally {
      tmpDir.removeCallback()
    }
  }

  private async _cleanupRevisions(botId: string, cleanAll: boolean = false): Promise<void> {
    const revs = (await this.listRevisions(botId)).reverse()
    const outDated = revs.filter((_, i) => cleanAll || i > MAX_REV)

    const globalGhost = this.ghostService.global()
    await Promise.mapSeries(outDated, rev => globalGhost.deleteFile(REVISIONS_DIR, rev))
  }

  private async _updateBotHealth(): Promise<void> {
    const botIds = await this.getBotsIds()

    Object.keys(BotService._botHealth)
      .filter(x => !botIds.includes(x))
      .forEach(id => delete BotService._botHealth[id])

    const redis = this.jobService.getRedisClient()
    if (redis) {
      const data = JSON.stringify({ serverId: process.SERVER_ID, hostname: os.hostname(), bots: BotService._botHealth })
      await redis.set(getBotStatusKey(process.SERVER_ID), data, 'PX', STATUS_EXPIRY)
    }
  }

  public async getBotHealth(workspaceId: string): Promise<ServerHealth[]> {
    const botIdsFilter = await this.workspaceService.getBotRefs(workspaceId)
    let serverHealth: ServerHealth[]

    const redis = this.jobService.getRedisClient()
    if (redis) {
      const serverIds = await redis.keys(getBotStatusKey('*'))
      if (!serverIds.length) {
        return []
      }

      const servers = await redis.mget(...serverIds)
      serverHealth = await Promise.mapSeries(servers, data => JSON.parse(data as string))
    } else {
      serverHealth = [{ serverId: process.SERVER_ID, hostname: os.hostname(), bots: BotService._botHealth }]
    }

    serverHealth.forEach(health => {
      health.bots = _.pick(health.bots, botIdsFilter)
    })
    return serverHealth
  }

  public static incrementBotStats(botId: string, type: 'error' | 'warning' | 'critical') {
    if (!this._botHealth[botId]) {
      this._botHealth[botId] = DEFAULT_BOT_HEALTH
    }

    if (type === 'error') {
      this._botHealth[botId].errorCount++
    } else if (type === 'warning') {
      this._botHealth[botId].warningCount++
    } else if (type === 'critical') {
      this._botHealth[botId].criticalCount++
      this._botHealth[botId].status = 'unhealthy'
    }
  }

  public static setBotStatus(botId: string, status: 'healthy' | 'unhealthy' | 'disabled') {
    this._botHealth[botId] = {
      ...(this._botHealth[botId] || DEFAULT_BOT_HEALTH),
      status
    }

    if (['disabled'].includes(status)) {
      this._botHealth[botId].errorCount = 0
      this._botHealth[botId].warningCount = 0
      this._botHealth[botId].criticalCount = 0
    }
  }
}
