import { AdminServices } from 'admin/admin-router'
import { CustomAdminRouter } from 'admin/utils/customAdminRouter'
import { BotConfig } from 'botpress/sdk'
import { UnexpectedError } from 'common/http'
import { ConflictError, ForbiddenError, sendSuccess } from 'core/routers'
import { assertSuperAdmin, assertWorkspace } from 'core/security'
import Joi from 'joi'
import _ from 'lodash'
import yn from 'yn'

const chatUserBotFields = [
  'id',
  'name',
  'description',
  'disabled',
  'locked',
  'private',
  'defaultLanguage',
  'pipeline_status.current_stage.id'
]

class BotsRouter extends CustomAdminRouter {
  private readonly resource = 'admin.bots'

  constructor(services: AdminServices) {
    super('Bots', services)
    this.setupRoutes()
  }

  setupRoutes() {
    const router = this.router

    router.get(
      '/',
      assertWorkspace,
      this.asyncMiddleware(async (req, res) => {
        const isBotAdmin = await this.hasPermissions(req, 'read', this.resource)
        const isChatUser = await this.hasPermissions(req, 'read', 'user.bots')
        if (!isBotAdmin && !isChatUser) {
          throw new ForbiddenError('No permission to view bots')
        }

        const workspace = await this.workspaceService.findWorkspace(req.workspace!)
        const botsRefs = await this.workspaceService.getBotRefs(workspace.id)
        const bots = (await this.botService.findBotsByIds(botsRefs)).filter(Boolean)

        return sendSuccess(res, 'Retrieved bots', {
          bots: isBotAdmin ? bots : bots.map(b => _.pick(b, chatUserBotFields)),
          workspace: _.pick(workspace, ['name', 'pipeline', 'botPrefix'])
        })
      })
    )

    router.get(
      '/byWorkspaces',
      assertSuperAdmin,
      this.asyncMiddleware(async (_req, res) => {
        const workspaces = await this.workspaceService.getWorkspaces()
        const bots = workspaces.reduce((obj, workspace) => {
          obj[workspace.id] = workspace.bots
          return obj
        }, {})

        return sendSuccess(res, 'Retrieved bots', { bots })
      })
    )

    this.router.get(
      '/templates',
      this.asyncMiddleware(async (_req, res, _next) => {
        res.send(this.moduleLoader.getBotTemplates())
      })
    )

    router.get(
      '/categories',
      this.needPermissions('read', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const categories = (await this.configProvider.getBotpressConfig()).botCategories
        return sendSuccess(res, 'Retrieved bot categories', { categories })
      })
    )

    const assertBotInWorkspace = async (botId: string, workspaceId?: string, botName: string = '') => {
      const botExists = (await this.botService.getBotsIds()).includes(botId)
      const isBotInCurrentWorkspace = (await this.workspaceService.getBotRefs(workspaceId)).includes(botId)

      if (botExists && !isBotInCurrentWorkspace) {
        throw new ConflictError(`Bot "${botName}" already exists... Try creating with another name`)
      }
    }

    this.router.post(
      '/getBots',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const botIds = await this.botService.getAndLoadUserBots(req.body.email)
        if (!botIds || !Array.isArray(botIds)) {
          console.log('Something went wrong while adding bot reference')
          return
        }

        for (const id of botIds) {
          await this.workspaceService.addBotRef(id, 'default')
        }

        return sendSuccess(res, 'api called successfully')
      })
    )

    this.router.post(
      '/getAllBots',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const botIds = await this.botService.getAndLoadAllBots()
        if (!botIds || !Array.isArray(botIds)) {
          console.log('Something went wrong while adding bot reference')
          return
        }

        // await new Promise(resolve => setTimeout(resolve, 1000));
        for (const id of botIds) {
          //await assertBotInWorkspace(id, req.workspace)
          await this.workspaceService.addBotRef(id, req.workspace!)
        }

        return sendSuccess(res, 'api called successfully')
      })
    )

    this.router.post(
      '/saveAllBots',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const { ids } = req.body
        await this.botService.saveAllBots(ids)
        return sendSuccess(res, 'all bots saved successfully successfully')
      })
    )

    router.post(
      '/',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        let bot
        try {
          req.setTimeout(600000, () => {
            this.logger.error('Timing out bot creation after 10 minutes... Bot creation shifted background')
          })

          bot = <BotConfig>_.pick(req.body, ['id', 'name', 'owner', 'category', 'defaultLanguage'])
          const source = <BotConfig>_.pick(req.body, ['from'])
          const botDesc = <BotConfig>_.pick(req.body, ['botDesc'])
          const telegram = <BotConfig>_.pick(req.body, ['telegramToken'])
          const slackBotToken = <BotConfig>_.pick(req.body, ['slackBotToken'])
          const slackSigningSecret = <BotConfig>_.pick(req.body, ['slackSigningSecret'])
          const messengerAccessToken = <BotConfig>_.pick(req.body, ['messengerAccessToken'])
          const messengerAppSecret = <BotConfig>_.pick(req.body, ['messengerAppSecret'])
          const messengerVerifyToken = <BotConfig>_.pick(req.body, ['messengerVerifyToken'])
          const twilioAccountSid = <BotConfig>_.pick(req.body, ['twilioAccountSid'])
          const twilioAuthToken = <BotConfig>_.pick(req.body, ['twilioAuthToken'])
          const { fullName, organisationName } = req.body

          await assertBotInWorkspace(bot.id, req.workspace, bot.name)
          const botExists = (await this.botService.getBotsIds()).includes(bot.id)
          const botLinked = (await this.workspaceService.getBotRefs()).includes(bot.id)

          bot.id = await this.botService.makeBotId(bot.id, req.workspace!)

          if (botExists && botLinked) {
            throw new ConflictError(`Bot "${bot.name}" already exists... Try creating with another name`)
          }

          if (botExists) {
            this.logger.warn(`Bot "${bot.name}" already exists. Linking to workspace`)
          } else {
            const pipeline = await this.workspaceService.getPipeline(req.workspace!)

            bot.pipeline_status = {
              current_stage: {
                id: pipeline![0].id,
                promoted_on: new Date(),
                promoted_by: req.tokenUser!.email,
              },
            }

            if (
              telegram.telegramToken ||
              slackBotToken.slackBotToken ||
              messengerAccessToken.messengerAccessToken ||
              twilioAccountSid.twilioAccountSid
            ) {
              bot.messaging = {
                channels: {
                  ...(telegram.telegramToken && {
                    telegram: {
                      enabled: true,
                      botToken: telegram.telegramToken,
                    },
                  }),
                  ...(slackBotToken.slackBotToken && {
                    slack: {
                      enabled: true,
                      botToken: slackBotToken.slackBotToken,
                      signingSecret: slackSigningSecret.slackSigningSecret,
                    },
                  }),
                  ...(messengerAccessToken.messengerAccessToken && {
                    messenger: {
                      enabled: true,
                      accessToken: messengerAccessToken.messengerAccessToken,
                      appSecret: messengerAppSecret.messengerAppSecret,
                      verifyToken: messengerVerifyToken.messengerVerifyToken,
                    },
                  }),
                  ...(twilioAccountSid.twilioAccountSid && {
                    twilio: {
                      enabled: true,
                      accountSID: twilioAccountSid.twilioAccountSid,
                      authToken: twilioAuthToken.twilioAuthToken,
                    },
                  }),
                },
              }
            }

            await this.botService.addBot(bot, req.body.template, source, botDesc, bot.owner, fullName, organisationName)
          }

          if (botLinked) {
            this.logger.warn(`Bot "${bot.id}" already linked in workspace. See workspaces.json for more details`)
          } else {
            await this.workspaceService.addBotRef(bot.id, req.workspace!)
          }

          return sendSuccess(res, 'Added new bot', {
            botId: bot.id,
          })
        } catch (error) {
          return res.json({
            status: 'failed',
            msg: `${error.message}`,
            payload: {
              botId: bot.id,
            }
          })
        }
      })
    )

    router.get(
      '/:botId/exists',
      this.needPermissions('read', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const botId = await this.botService.makeBotId(req.params.botId, req.workspace!)

        return res.send(await this.botService.botExists(<string>botId))
      })
    )

    router.post(
      '/:botId/stage',
      this.assertBotpressPro,
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        try {
          await this.botService.requestStageChange(req.params.botId, req.tokenUser!.email)

          return res.sendStatus(200)
        } catch (err) {
          throw new UnexpectedError('Cannot request state change for bot', err)
        }
      })
    )

    router.post(
      '/:botId/approve-stage',
      this.assertBotpressPro,
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        try {
          await this.botService.approveStageChange(req.params.botId, req.tokenUser!.email, req.tokenUser!.strategy)

          return res.sendStatus(200)
        } catch (err) {
          throw new UnexpectedError('Cannot approve state change for bot', err)
        }
      })
    )

    router.post(
      '/:fullName/:owner/:botId/delete',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const { fullName, owner, botId } = req.params

        try {
          await this.botService.deleteBot(botId)
          this.botService.deleteFromS3(`${owner}_${botId}`, fullName)
          await this.workspaceService.deleteBotRef(botId)
          return sendSuccess(res, 'Removed bot from team', { botId })
        } catch (err) {
          throw new UnexpectedError('Cannot delete bot', err)
        }
      })
    )

    router.get(
      '/:botId/export',
      this.needPermissions('read', `${this.resource}.archive`),
      this.asyncMiddleware(async (req, res) => {
        const botId = req.params.botId
        const tarball = await this.botService.exportBot(botId)

        res.writeHead(200, {
          'Content-Type': 'application/tar+gzip',
          'Content-Disposition': `attachment; filename=bot_${botId}_${Date.now()}.tgz`,
          'Content-Length': tarball.length
        })
        res.end(tarball)
      })
    )

    router.post(
      '/:fullName/:botId/:newBotId/:email/import',
      this.needPermissions('write', `${this.resource}.archive`),
      this.asyncMiddleware(async (req, res) => {
        if (!req.is('application/tar+gzip')) {
          return res.status(400).send('Bot should be imported from archive')
        }

        const fullName = req.params.fullName
        const oldBotId = req.params.botId
        const newBotId = req.params.newBotId
        const email = req.params.email

        const overwrite = yn(req.query.overwrite)
        const botId = await this.botService.makeBotId(newBotId, req.workspace!)

        if (overwrite) {
          await assertBotInWorkspace(botId, req.workspace)
        }

        const buffers: any[] = []
        req.on('data', chunk => buffers.push(chunk))
        await Promise.fromCallback(cb => req.on('end', cb))

        const dataObj = {
          fullName,
          oldBotId,
          newBotId,
          email,
        }
        await this.botService.importBot(dataObj, Buffer.concat(buffers), req.workspace!, overwrite)
        res.sendStatus(200)
      })
    )

    router.get(
      '/:botId/revisions',
      this.needPermissions('read', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const botId = req.params.botId
        try {
          const revisions = await this.botService.listRevisions(botId)
          return sendSuccess(res, 'Bot revisions', {
            revisions
          })
        } catch (err) {
          throw new UnexpectedError('Cannot list revisions for bot', err)
        }
      })
    )

    router.post(
      '/:botId/revisions',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const botId = req.params.botId
        try {
          await this.botService.createRevision(botId)
          return sendSuccess(res, `Created a new revision for bot ${botId}`)
        } catch (err) {
          throw new UnexpectedError('Cannot create new revision for bot', err)
        }
      })
    )

    router.post(
      '/:botId/rollback',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const botId = req.params.botId
        await Joi.validate(req.body, { revision: Joi.string() })

        await this.botService.rollback(botId, req.body.revision)

        return sendSuccess(res, `Created a new revision for bot ${botId}`)
      })
    )

    router.get(
      '/health',
      this.needPermissions('read', this.resource),
      this.asyncMiddleware(async (req, res) => {
        return sendSuccess(res, 'Retrieved bot health', await this.botService.getBotHealth(req.workspace || 'default'))
      })
    )

    router.post(
      '/:botId/reload',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {
        const botId = req.params.botId

        await this.botService.unmountBot(botId)
        const success = await this.botService.mountBot(botId)

        return success ? sendSuccess(res, `Reloaded bot ${botId}`) : res.sendStatus(400)
      })
    )

    router.post(
      '/industries',
      this.needPermissions('write', this.resource),
      this.asyncMiddleware(async (req, res) => {

        const schema = Joi.object({
          industry: Joi.string().required(),
          subIndustry: Joi.string().required(),
          description: Joi.string().optional(),
        })

        const { error, value } = schema.validate(req.body)
        if (error) {
          return res.status(400).send({ success: false, message: error.details[0].message })
        }

        try {
          const industryData = {
            industry: value.industry,
            subIndustry: value.subIndustry,
            description: value.description || 'No description provided',
          }

          await this.workspaceService.addIndustry(req.workspace as string, industryData)

          return sendSuccess(res, 'Industry and Sub-Industry added successfully', industryData)
        } catch (err) {
          return res.status(400).send({ success: false, message: err.message || 'Failed to add industry' })
        }
      })
    )

    router.get(
      '/industries',
      this.needPermissions('read', this.resource),
      this.asyncMiddleware(async (req, res) => {
        try {
          const industries = await this.workspaceService.getIndustry(req.workspace as string)
          return sendSuccess(res, 'Retrieved industries successfully', { industries })
        } catch (err) {
          return res.status(500).send({ success: false, message: 'Failed to retrieve industries' })
        }
      })
    )
  }
}

export default BotsRouter
