# Configuration

**TODO: UPDATE ME**

`@firesync/server` is configured by setting environment variables, for example:

```sh
$ export POSTGRES_DATABASE=acme-db
$ npx @firesync/server server
```

# Available environment variables

## Database

* `POSTGRES_HOST`: The hostname or IP address of the PostgreSQL server to connect to. Defaults to 'localhost'.
* `POSTGRES_PORT`:  The port number that the PostgreSQL server is listening on. Defaults to 5432.
* `POSTGRES_DATABASE`: The name of the PostgreSQL database to connect to.
* `POSTGRES_USER`: The username to use when authenticating with the PostgreSQL server.
* `POSTGRES_PASSWORD`: The password to use when authenticating with the PostgreSQL server.

### SSL config for database

* `DATABASE_SSL`: Whether SSL should be used for the database connection. This property should be set to "true" or "false". Defaults to "false".
* `DATABASE_SSL_REJECT_UNAUTHORIZED`: Whether to reject self-signed SSL certificates. This property should be set to "true" or "false". Defaults to "false"
* `DATABASE_SSL_CA`: Override the trusted CA certificates. See `ca` in [`tls.createSecureContext`](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions) for more information.
* `DATABASE_SSL_KEY`: Private keys in PEM format. See `key` in [`tls.createSecureContext`](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions) for more information.
* `DATABASE_SSL_CERT`: Cert chains in PEM format. See `cert` in [`tls.createSecureContext`](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions) for more information.

## Session Secret

**TODO: Move this to be auto-generated for a project and stored in the db**

* `SESSION_SECRET`: The secret the session cookie is signed with this secret to prevent tampering.

## Deployment Options

* `TRUST_PROXY`: Set to "true" if running behind a proxy. This allows `@firesync/server` to set a secure cookie even over an http connection from the proxy, and to look at forwarded headers like `x-forwarded-host`.
