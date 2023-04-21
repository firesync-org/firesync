# Configuration

`@firesync/server` is configured by setting environment variables, for example:

```bash
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

```bash
# Allow access from all domains
$ export FS_CORS_ALLOW_ORIGINS='*'

# Allow access from only one domain
$ export FS_CORS_ALLOW_ORIGINS=https://example.com

# Allow access from some foo.example.com and any sub-domain of bar.example.com
$ export FS_CORS_ALLOW_ORIGINS=https://foo.example.com,https://*.bar.example.com
```

See https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS for more information.

## Authentication

### `FS_JWT_AUTH_SECRET`

Set `FS_JWT_AUTH_SECRET` to the value used to sign the JWTs used for authentication. Accepts a comma delimited list of valid secrets, which can be used for rotating secrets to add a new secret while the old one remains valid until removed.

```bash
# A single secret
$ export FS_JWT_AUTH_SECRET='/B?E(H+KbPeShVmYq3t6w9zDC&F)J@Nc'
# Support two valid secrets:
#   /B?E(H+KbPeShVmYq3t6w9zDC&F)J@Nc
#   3t6w9zE$B&E)H@McQfTjWnZr4u7x!A%D*
$ export FS_JWT_AUTH_SECRET='/B?E(H+KbPeShVmYq3t6w9zDC&F)J@Nc,3t6w9zE$B&E)H@McQfTjWnZr4u7x!A%D*'
```



