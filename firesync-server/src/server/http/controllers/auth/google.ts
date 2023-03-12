import passport from 'passport'
import {
  AuthenticateOptionsGoogle,
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback
} from 'passport-google-oauth20'
import querystring from 'node:querystring'
import { Request } from 'express'

import { requestHandler } from '../../helpers/requestHandler'
import {
  AuthProviderGoogle,
  ProjectUser,
  ProjectUserAuthProvider,
  db
} from '../../../../db/db'
import { UnexpectedInternalStateError } from '../../../../shared/errors'
import { tokens } from '../../../models/tokens'
import models from '../../../../server/models'
import { getHostName } from '../../helpers/host'

type RequestWithAuthCredentials = Request & {
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

    const project = await models.projects.getProjectFromRequest(req)
    const strategyName = `google:${project.id}`

    const authCredentials = await db
      .knex('auth_provider_google')
      .select(
        'project_id',
        'client_id',
        'client_secret',
        'success_redirect_url'
      )
      .where('project_id', project.id)
      .first()

    if (authCredentials === undefined) {
      return res.status(404).render('projects/noGoogleAuth')
    }

    const reqWithAuthCreds = req as RequestWithAuthCredentials
    reqWithAuthCreds.authCredentials = authCredentials

    const hostName = getHostName(req)
    strategies[strategyName] = new GoogleStrategy(
      {
        clientID: authCredentials.client_id,
        clientSecret: authCredentials.client_secret,
        callbackURL: `//${hostName}/auth/google/callback`
      },
      loadGoogleUser(project.id)
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
            throw new UnexpectedInternalStateError(
              'Expected user to have been created'
            )
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
      // eslint-disable-next-line n/no-callback-literal
      cb(error as Error)
    }
  }

export const googleAuthController = {
  startAuth: loadGoogleStrategyForProject({ scope: ['profile'] }),

  callback: [
    loadGoogleStrategyForProject({ failureRedirect: '/login', session: false }),
    requestHandler<RequestWithAuthCredentials>(async (req, res) => {
      const userId = req.user?.userId
      if (userId === undefined) {
        throw new UnexpectedInternalStateError('Expected userId')
      }

      const { refreshToken, accessToken, expiresInSeconds } =
        await tokens.generateTokens(userId)

      if (
        req.authCredentials.success_redirect_url &&
        req.authCredentials.success_redirect_url !== ''
      ) {
        res.redirect(
          `${req.authCredentials.success_redirect_url}#${querystring.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresInSeconds,
            token_type: 'bearer'
          })}`
        )
      } else {
        res.render('projects/noGoogleSuccessRedirectUrl')
      }
    })
  ]
}
