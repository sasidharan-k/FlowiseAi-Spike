import express, { Request, Response } from 'express'
import path from 'path'
import cors from 'cors'
import http from 'http'
import cookieParser from 'cookie-parser'
import basicAuth from 'express-basic-auth'
import { DataSource } from 'typeorm'
import { MODE } from './Interface'
import { getNodeModulesPackagePath, getEncryptionKey } from './utils'
import logger, { expressRequestLogger } from './utils/logger'
import { getDataSource } from './DataSource'
import { NodesPool } from './NodesPool'
import { ChatFlow } from './database/entities/ChatFlow'
import { CachePool } from './CachePool'
import { AbortControllerPool } from './AbortControllerPool'
import { RateLimiterManager } from './utils/rateLimit'
import { getAPIKeys } from './utils/apiKey'
import { getAllowedIframeOrigins, getCorsOptions, sanitizeMiddleware } from './utils/XSS'
import { Telemetry } from './utils/telemetry'
import flowiseApiV1Router from './routes'
import errorHandlerMiddleware from './middlewares/errors'
import authMiddleware from './middlewares/auth'
import { WHITELIST_URLS } from './utils/constants'
import featureUsageMiddleware from './middlewares/usage'
import { createClient } from './utils/supabase'
import { DefaultAzureCredential } from '@azure/identity'
import { SecretClient } from '@azure/keyvault-secrets'
import { initializeStripeClient } from './utils/stripe'
import { initializeJwtCookieMiddleware, verifyToken } from './enterprise/middleware/passport'
import { ENTERPRISE_FEATURES, IdentityManager } from './IdentityManager'
import { initializePrometheus } from './enterprise/middleware/prometheus'
import { SSEStreamer } from './utils/SSEStreamer'
import { getAPIKeyWorkspaceID, validateAPIKey } from './utils/validateKey'
import { IUser } from './enterprise/Interface.Enterprise'
import { IMetricsProvider } from './Interface.Metrics'
import { Prometheus } from './metrics/Prometheus'
import { OpenTelemetry } from './metrics/OpenTelemetry'
import { QueueManager } from './queue/QueueManager'
import { RedisEventSubscriber } from './queue/RedisEventSubscriber'
import 'global-agent/bootstrap'

declare global {
    namespace Express {
        interface User extends IUser {}
        interface Request {
            user?: IUser
        }
        namespace Multer {
            interface File {
                bucket: string
                key: string
                acl: string
                contentType: string
                contentDisposition: null
                storageClass: string
                serverSideEncryption: null
                metadata: any
                location: string
                etag: string
            }
        }
    }
}

export class App {
    app: express.Application
    nodesPool: NodesPool
    abortControllerPool: AbortControllerPool
    cachePool: CachePool
    telemetry: Telemetry
    secretClient: SecretClient
    rateLimiterManager: RateLimiterManager
    AppDataSource: DataSource = getDataSource()
    sseStreamer: SSEStreamer
    identityManager: IdentityManager
    metricsProvider: IMetricsProvider
    queueManager: QueueManager
    redisSubscriber: RedisEventSubscriber

    constructor() {
        this.app = express()
    }

    async initDatabase() {
        // Initialize database
        try {
            await this.AppDataSource.initialize()
            logger.info('📦 [server]: Data Source is initializing...')

            // Run Migrations Scripts
            await this.AppDataSource.runMigrations({ transaction: 'each' })

            // Initialize Identity Manager
            this.identityManager = new IdentityManager()
            await this.identityManager.initialize()

            // Initialize nodes pool
            this.nodesPool = new NodesPool()
            await this.nodesPool.initialize()

            // Initialize abort controllers pool
            this.abortControllerPool = new AbortControllerPool()

            // Initialize API keys
            await getAPIKeys()

            // Initialize encryption key
            await getEncryptionKey()

            // Initialize Rate Limit
            this.rateLimiterManager = RateLimiterManager.getInstance()
            await this.rateLimiterManager.initializeRateLimiters(await getDataSource().getRepository(ChatFlow).find())

            // Initialize cache pool
            this.cachePool = new CachePool()

            // Initialize telemetry
            this.telemetry = new Telemetry()

            // Initialize SSE Streamer
            this.sseStreamer = new SSEStreamer()

            // Init Queues
            if (process.env.MODE === MODE.QUEUE) {
                this.queueManager = QueueManager.getInstance()
                this.queueManager.setupAllQueues({
                    componentNodes: this.nodesPool.componentNodes,
                    telemetry: this.telemetry,
                    cachePool: this.cachePool,
                    appDataSource: this.AppDataSource,
                    abortControllerPool: this.abortControllerPool
                })
                this.redisSubscriber = new RedisEventSubscriber(this.sseStreamer)
                await this.redisSubscriber.connect()
            }

            logger.info('📦 [server]: Data Source has been initialized!')

            // Initialize Azure Secret Client
            if (this.identityManager.isCloud()) {
                this.secretClient = initializeAzureSecretClient()
            }
        } catch (error) {
            logger.error('❌ [server]: Error during Data Source initialization:', error)
        }
    }

    async config() {
        // Limit is needed to allow sending/receiving base64 encoded string
        const flowise_file_size_limit = process.env.FLOWISE_FILE_SIZE_LIMIT || '50mb'
        this.app.use(express.json({ limit: flowise_file_size_limit }))
        this.app.use(express.urlencoded({ limit: flowise_file_size_limit, extended: true }))
        this.app.set('trust proxy', 'loopback')

        // Allow access from specified domains
        this.app.use(cors(getCorsOptions()))

        // Parse cookies
        this.app.use(cookieParser())

        // Allow embedding from specified domains.
        this.app.use((req, res, next) => {
            const allowedOrigins = getAllowedIframeOrigins()
            if (allowedOrigins == '*') {
                next()
            } else {
                const csp = `frame-ancestors ${allowedOrigins}`
                res.setHeader('Content-Security-Policy', csp)
                next()
            }
        })

        // Switch off the default 'X-Powered-By: Express' header
        this.app.disable('x-powered-by')

        // Add the expressRequestLogger middleware to log all requests
        this.app.use(expressRequestLogger)

        // Add the sanitizeMiddleware to guard against XSS
        this.app.use(sanitizeMiddleware)

        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Credentials', 'true') // Allow credentials (cookies, etc.)
            if (next) next()
        })

        const whitelistURLs = WHITELIST_URLS
        const URL_CASE_INSENSITIVE_REGEX: RegExp = /\/api\/v1\//i
        const URL_CASE_SENSITIVE_REGEX: RegExp = /\/api\/v1\//

        if (this.identityManager.isEnterprise()) {
            if (this.identityManager.hasEnterpriseFeature(ENTERPRISE_FEATURES.METRICS_PROMETHEUS)) {
                initializePrometheus(this.app)
            }

            if (this.identityManager.hasEnterpriseFeature(ENTERPRISE_FEATURES.AUTHORIZATION_COOKIE)) {
                await initializeJwtCookieMiddleware(this.app, this.identityManager)
                this.app.use(async (req, res, next) => {
                    // Step 1: Check if the req path contains /api/v1 regardless of case
                    if (URL_CASE_INSENSITIVE_REGEX.test(req.path)) {
                        // Step 2: Check if the req path is case sensitive
                        if (URL_CASE_SENSITIVE_REGEX.test(req.path)) {
                            // Step 3: Check if the req path is in the whitelist
                            const isWhitelisted = whitelistURLs.some((url) => req.path.startsWith(url))
                            if (isWhitelisted) {
                                next()
                            } else if (req.headers['x-request-from'] === 'internal') {
                                verifyToken(req, res, next)
                            } else {
                                // Check if license is valid
                                if (!this.identityManager.isEnterpriseLicenseValid()) {
                                    return res.status(401).json({ error: 'Unauthorized Access' })
                                }
                                const isKeyValidated = await validateAPIKey(req)
                                if (!isKeyValidated) {
                                    return res.status(401).json({ error: 'Unauthorized Access' })
                                }
                                const apiKeyWorkSpaceId = await getAPIKeyWorkspaceID(req)
                                if (apiKeyWorkSpaceId) {
                                    //@ts-ignore
                                    req.user = { activeWorkspaceId: apiKeyWorkSpaceId, isApiKeyValidated: true }
                                    next()
                                } else {
                                    return res.status(401).json({ error: 'Unauthorized Access' })
                                }
                            }
                        } else {
                            return res.status(401).json({ error: 'Unauthorized Access' })
                        }
                    } else {
                        // If the req path does not contain /api/v1, then allow the request to pass through, example: /assets, /canvas
                        next()
                    }
                })
            }

            // this is for SSO and must be after the JWT cookie middleware
            await this.identityManager.initializeSSO(this.app)
        } else if (this.identityManager.isCloud()) {
            // Add supabase client middleware
            this.app.use(async (req, res, next) => {
                // Step 1: Check if the req path contains /api/v1 regardless of case
                if (URL_CASE_INSENSITIVE_REGEX.test(req.path)) {
                    // Step 2: Check if the req path is case sensitive
                    if (URL_CASE_SENSITIVE_REGEX.test(req.path)) {
                        // Step 3: Check if the req path is in the whitelist
                        // we still want supabase client to be available for the prediction and upsert vector endpoints
                        const execeptionList = ['/api/v1/prediction/', '/api/v1/vector/upsert/']
                        const isWhitelisted = whitelistURLs
                            .filter((url) => !execeptionList.includes(url))
                            .some((url) => req.path.startsWith(url))
                        if (isWhitelisted) {
                            next()
                        } else if (execeptionList.some((url) => req.path.startsWith(url)) || req.headers['x-request-from'] === 'internal') {
                            const { client: supabase, jwtPayload } = await createClient({ req, res })
                            const stripe = await initializeStripeClient()
                            this.app.locals.supabase = supabase
                            this.app.locals.stripe = stripe
                            this.app.locals.jwtPayload = jwtPayload
                            next()
                        } else {
                            const isKeyValidated = await validateAPIKey(req)
                            if (!isKeyValidated) {
                                return res.status(401).json({ error: 'Unauthorized Access' })
                            }
                            next()
                        }
                    } else {
                        return res.status(401).json({ error: 'Unauthorized Access' })
                    }
                } else {
                    // If the req path does not contain /api/v1, then allow the request to pass through, example: /assets, /canvas
                    next()
                }
            })

            // Add the auth middleware and apply to all non-whitelisted routes
            this.app.use(authMiddleware)

            // Add the usage middleware for the prediction endpoint
            this.app.use('/api/v1/prediction', featureUsageMiddleware)
        } else {
            if (process.env.FLOWISE_USERNAME && process.env.FLOWISE_PASSWORD) {
                const username = process.env.FLOWISE_USERNAME
                const password = process.env.FLOWISE_PASSWORD
                const basicAuthMiddleware = basicAuth({
                    users: { [username]: password }
                })
                this.app.use(async (req, res, next) => {
                    // Step 1: Check if the req path contains /api/v1 regardless of case
                    if (URL_CASE_INSENSITIVE_REGEX.test(req.path)) {
                        // Step 2: Check if the req path is case sensitive
                        if (URL_CASE_SENSITIVE_REGEX.test(req.path)) {
                            // Step 3: Check if the req path is in the whitelist
                            const isWhitelisted = whitelistURLs.some((url) => req.path.startsWith(url))
                            if (isWhitelisted) {
                                next()
                            } else if (req.headers['x-request-from'] === 'internal') {
                                basicAuthMiddleware(req, res, next)
                            } else {
                                const isKeyValidated = await validateAPIKey(req)
                                if (!isKeyValidated) {
                                    return res.status(401).json({ error: 'Unauthorized Access' })
                                }
                                next()
                            }
                        } else {
                            return res.status(401).json({ error: 'Unauthorized Access' })
                        }
                    } else {
                        // If the req path does not contain /api/v1, then allow the request to pass through, example: /assets, /canvas
                        next()
                    }
                })
            } else {
                this.app.use(async (req, res, next) => {
                    // Step 1: Check if the req path contains /api/v1 regardless of case
                    if (URL_CASE_INSENSITIVE_REGEX.test(req.path)) {
                        // Step 2: Check if the req path is case sensitive
                        if (URL_CASE_SENSITIVE_REGEX.test(req.path)) {
                            // Step 3: Check if the req path is in the whitelist
                            const isWhitelisted = whitelistURLs.some((url) => req.path.startsWith(url))
                            if (isWhitelisted) {
                                next()
                            } else if (req.headers['x-request-from'] === 'internal') {
                                next()
                            } else {
                                const isKeyValidated = await validateAPIKey(req)
                                if (!isKeyValidated) {
                                    return res.status(401).json({ error: 'Unauthorized Access' })
                                }
                                next()
                            }
                        } else {
                            return res.status(401).json({ error: 'Unauthorized Access' })
                        }
                    } else {
                        // If the req path does not contain /api/v1, then allow the request to pass through, example: /assets, /canvas
                        next()
                    }
                })
            }
        }

        if (process.env.ENABLE_METRICS === 'true') {
            switch (process.env.METRICS_PROVIDER) {
                // default to prometheus
                case 'prometheus':
                case undefined:
                    this.metricsProvider = new Prometheus(this.app)
                    break
                case 'open_telemetry':
                    this.metricsProvider = new OpenTelemetry(this.app)
                    break
                // add more cases for other metrics providers here
            }
            if (this.metricsProvider) {
                await this.metricsProvider.initializeCounters()
                logger.info(`📊 [server]: Metrics Provider [${this.metricsProvider.getName()}] has been initialized!`)
            } else {
                logger.error(
                    "❌ [server]: Metrics collection is enabled, but failed to initialize provider (valid values are 'prometheus' or 'open_telemetry'."
                )
            }
        }

        this.app.use('/api/v1', flowiseApiV1Router)

        // ----------------------------------------
        // Configure number of proxies in Host Environment
        // ----------------------------------------
        this.app.get('/api/v1/ip', (request, response) => {
            response.send({
                ip: request.ip,
                msg: 'Check returned IP address in the response. If it matches your current IP address ( which you can get by going to http://ip.nfriedly.com/ or https://api.ipify.org/ ), then the number of proxies is correct and the rate limiter should now work correctly. If not, increase the number of proxies by 1 and restart Cloud-Hosted Flowise until the IP address matches your own. Visit https://docs.flowiseai.com/configuration/rate-limit#cloud-hosted-rate-limit-setup-guide for more information.'
            })
        })

        if (process.env.MODE === MODE.QUEUE) {
            this.app.use('/admin/queues', this.queueManager.getBullBoardRouter())
        }

        // ----------------------------------------
        // Serve UI static
        // ----------------------------------------

        const packagePath = getNodeModulesPackagePath('flowise-ui')
        const uiBuildPath = path.join(packagePath, 'build')
        const uiHtmlPath = path.join(packagePath, 'build', 'index.html')

        this.app.use('/', express.static(uiBuildPath))

        // All other requests not handled will return React app
        this.app.use((req: Request, res: Response) => {
            res.sendFile(uiHtmlPath)
        })

        // Error handling
        this.app.use(errorHandlerMiddleware)
    }

    async stopApp() {
        try {
            const removePromises: any[] = []
            removePromises.push(this.telemetry.flush())
            if (this.queueManager) {
                removePromises.push(this.redisSubscriber.disconnect())
            }
            await Promise.all(removePromises)
        } catch (e) {
            logger.error(`❌[server]: Flowise Server shut down error: ${e}`)
        }
    }
}

function initializeAzureSecretClient() {
    const credential = new DefaultAzureCredential()

    const vaultName = `https://${process.env.AZURE_KEY_VAULT_NAME}.vault.azure.net`
    const secretClient = new SecretClient(vaultName, credential)

    return secretClient
}

let serverApp: App | undefined

export async function start(): Promise<void> {
    serverApp = new App()

    const host = process.env.HOST || '127.0.0.1'
    const port = parseInt(process.env.PORT || '', 10) || 3000
    const server = http.createServer(serverApp.app)

    await serverApp.initDatabase()
    await serverApp.config()

    server.listen(port, host, () => {
        logger.info(`⚡️ [server]: Flowise Server is listening at ${host ? 'http://' + host : ''}:${port}`)
    })
}

export function getInstance(): App | undefined {
    return serverApp
}
