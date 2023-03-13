# Configuration

`@firesync/server` is configured by setting environment variables, for example:

```sh
$ export FS_POSTGRES_DATABASE=acme-db
$ npx @firesync/server server
```

# Available environment variables

## Database

### `FS_POSTGRES_HOST`

The hostname or IP address of the PostgreSQL server to connect to. Defaults to 'localhost'.

### `FS_POSTGRES_PORT`

The port number that the PostgreSQL server is listening on. Defaults to 5432.

### `FS_POSTGRES_DATABASE`

The name of the PostgreSQL database to connect to.

### `FS_POSTGRES_USER`

The username to use when authenticating with the PostgreSQL server.

### `FS_POSTGRES_PASSWORD`

The password to use when authenticating with the PostgreSQL server.

### `FS_DATABASE_SSL`

Set `FS_DATABASE_SSL=true` if SSL should be used for the database connection. Defaults to `false`.

### `FS_DATABASE_SSL_REJECT_UNAUTHORIZED`:

Set `FS_DATABASE_SSL_REJECT_UNAUTHORIZED=true` to accept self-signed SSL certificates. Defaults to `false`.

### `FS_DATABASE_SSL_CA`

Override the trusted CA certificates. See `ca` in [`tls.createSecureContext`](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions) for more information.

### `FS_DATABASE_SSL_KEY`

Private keys in PEM format. See `key` in [`tls.createSecureContext`](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions) for more information.

### `FS_DATABASE_SSL_CERT`

Cert chains in PEM format. See `cert` in [`tls.createSecureContext`](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions) for more information.

## Deployment Options

### `FS_TRUST_PROXY`

Set `FS_TRUST_PROXY=true` if running behind a proxy. This tells `@firesync/server` to trust headers like `x-forwarded-host` to accurately determine the host name behind a proxy.

### `FS_CORS_ALLOWED_ORIGINS`

Set `FS_CORS_ALLOWED_ORIGINS` to restrict Cross-Origin Resource Sharing (CORS) to specific [origins](https://developer.mozilla.org/en-US/docs/Glossary/Origin), to only allow access to FireSync from client code running on specific domains, protocols and/or ports. Accepts a comma delimited list of origins, with `*` as a wildcard, e.g.

```sh
# Allow access from all domains
$ export FS_CORS_ALLOW_ORIGINS='*'

# Allow access from only one domain
$ export FS_CORS_ALLOW_ORIGINS=https://example.com

# Allow access from some foo.example.com and any sub-domain of bar.example.com
$ export FS_CORS_ALLOW_ORIGINS=https://foo.example.com,https://*.bar.example.com
```

See https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS for more information.

## Invites

### `FS_REDEEM_INVITE_URL`

The URL in your app to redirect to after a user has accepted an invite to join on a doc.

## Google Auth

To enable users to log in to your FireSync project with Google, you will need to configure some [Google OAuth 2.0 credentials](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#creatingcred).

:::note 

When you create the credentials in Google, put in `http://localhost:5000/auth/google/callback` (replace `http://localhost:5000` with wherever your FireSync server is running) as an 'Authorised Redirect URL'.

:::

### `FS_GOOGLE_AUTH_CLIENT_ID`

Your Google OAuth 2.0 Client ID

### `FS_GOOGLE_AUTH_CLIENT_SECRET`

Your Google OAuth 2.0 Client Secret

### `FS_GOOGLE_AUTH_SUCCESS_REDIRECT_URL`

The URL in your application that FireSync should redirect to in your application after successfully authenticating. For example:

```sh
$ export FS_GOOGLE_AUTH_SUCCESS_REDIRECT_URL=http://my-app.example.com/dashboard
```

The redirect URL will have some data appended to with the session tokens which the `@firesync/client` library will automatically read in to set up the client session.

:::tip 

Note that there are two redirects which happen during the authentication flow:

1. FireSync sends your user to Google to authenticate, and then Google redirects back to FireSync. You need to configure the 'Authorised Redirect URIs' in your Google OAuth 2.0 credentials to include `http://localhost:5000/auth/google/callback` (or replace `http://localhost:5000` with wherever your FireSync server is running) to make this step work.
2. FireSync then sets up the user session in FireSync, and redirects back to your app. You configure this redirect to with `FS_GOOGLE_AUTH_SUCCESS_REDIRECT_URL`.

:::
