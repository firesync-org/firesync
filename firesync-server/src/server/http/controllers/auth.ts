import passport from 'passport'
import {
  AuthenticateOptionsGoogle,
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback
} from 'passport-google-oauth20'
import { RequestWithProject, requestHandler } from '../helpers/requestHandler'
import {
  AuthProviderGoogle,
  ProjectUser,
  ProjectUserAuthProvider,
  db
} from '../../../db/db'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      userId: string
    }
  }
}

passport.serializeUser(function (user, done) {
  done(null, user)
})

passport.deserializeUser(function (user: any, done) {
  done(null, user)
})

type RequestWithAuthCredentials = RequestWithProject & {
  authCredentials: Pick<
    AuthProviderGoogle,
    'project_id' | 'client_id' | 'client_secret' | 'success_redirect_url'
  >
}

const loadGoogleStrategyForProject = (options: AuthenticateOptionsGoogle) => {
  return requestHandler(async (req, res, next) => {
    const strategies = (passport as any)._strategies as Record<
      string,
      passport.Strategy
    >

    const projectId = req.firesync.project.id
    const projectName = req.firesync.project.name
    const strategyName = `google:${projectName}`

    const authCredentials = await db
      .knex('auth_provider_google')
      .select(
        'project_id',
        'client_id',
        'client_secret',
        'success_redirect_url'
      )
      .where('project_id', projectId)
      .first()

    if (authCredentials === undefined) {
      return res
        .status(404)
        .send('Google auth is not configured for this project')
    }

    const reqWithAuthCreds = req as RequestWithAuthCredentials
    reqWithAuthCreds.authCredentials = authCredentials

    strategies[strategyName] = new GoogleStrategy(
      {
        clientID: authCredentials.client_id,
        clientSecret: authCredentials.client_secret,
        // TODO - make configurable for production
        callbackURL: `https://${projectName}.api.localtest.me/auth/google/callback`
      },
      loadGoogleUser(projectId)
    )

    passport.authenticate(strategyName, options)(req, res, next)
  })
}

const loadGoogleUser =
  (projectId: string) =>
  async (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    cb: VerifyCallback
  ) => {
    try {
      const projectUser = await db.knex
        .select(db.knex.ref('id').withSchema('project_users').as('id'))
        .from<ProjectUser>('project_users')
        .leftJoin<ProjectUserAuthProvider>(
          'project_user_auth_providers',
          'project_users.id',
          'project_user_auth_providers.project_user_id'
        )
        .where('project_users.project_id', projectId)
        .where('project_user_auth_providers.auth_provider', 'google')
        .where('project_user_auth_providers.external_user_id', profile.id)
        .first()

      if (projectUser !== undefined) {
        return cb(null, { userId: projectUser.id })
      } else {
        await db.knex.transaction(async (txn) => {
          const [newProjectUser] = await txn('project_users').insert(
            { project_id: projectId },
            ['id']
          )
          if (newProjectUser === undefined) {
            // TODO: UnexpectedError
            throw new Error('Expected user to have been created')
          }
          await txn('project_user_auth_providers').insert({
            project_user_id: newProjectUser.id,
            auth_provider: 'google',
            external_user_id: profile.id
          })

          return cb(null, { userId: newProjectUser.id })
        })
      }
    } catch (error) {
      cb(error instanceof Error ? error : new Error('oops')) // TODO: UnexpectedError
    }
  }

export const authController = {
  /**
   * @openapi
   * /api/v1/user:
   *   get:
   *     description: Welcome to swagger-jsdoc!
   *     responses:
   *       200:
   *         description: Returns a mysterious string.
   */
  getUser: requestHandler((req, res) => {
    const user = req.user
    if (user !== undefined) {
      return res.json({ userId: user.userId })
    } else {
      return res.status(403).send('No user')
    }
  }),

  authGoogle: loadGoogleStrategyForProject({ scope: ['profile'] }),

  authGoogleCallback: [
    loadGoogleStrategyForProject({ failureRedirect: '/login' }),
    requestHandler<RequestWithAuthCredentials>((req, res) => {
      res.redirect(req.authCredentials.success_redirect_url)
    })
  ]
}
