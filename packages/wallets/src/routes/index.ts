import { Router } from 'express'
import walletRoute from './wallet/index.js'

export default Router().use('/wallets', walletRoute)
