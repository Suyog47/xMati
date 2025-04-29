import * as sdk from 'botpress/sdk'
import { asyncMiddleware as asyncMw, BPRequest } from 'common/http'

export default async (bp: typeof sdk) => {
  const asyncMiddleware = asyncMw(bp.logger);
  const router = bp.http.createRouterForBot('complete-module')

  // Link to access this route: http://localhost:3000/api/v1/bots/BOT_NAME/mod/complete-module/my-first-route
  router.post('/add', asyncMiddleware(async (req: any, res: any) => {
    // Since the bot ID is required to access your module,
    const botId = req.params.botId
    console.log('got it' + botId);
    //const config = await bp.config.getModuleConfigForBot('complete-module', botId)

    res.sendStatus(200)
  })
  )
}
