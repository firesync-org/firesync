# CLI

<!-- This file is populated via scripts/generate-cli.sh from running `oclif readme` on the firesync-server CLI -->

## Commands

<!-- commands -->
* [`firesync-server debug watchDoc DOCKEY`](#firesync-server-debug-watchdoc-dockey)
* [`firesync-server help [COMMANDS]`](#firesync-server-help-commands)
* [`firesync-server migrations migrate`](#firesync-server-migrations-migrate)
* [`firesync-server migrations rollback`](#firesync-server-migrations-rollback)
* [`firesync-server migrations seed`](#firesync-server-migrations-seed)
* [`firesync-server server`](#firesync-server-server)
* [`firesync-server setup`](#firesync-server-setup)

## `firesync-server debug watchDoc DOCKEY`

Watch the update structure of a document

```
USAGE
  $ firesync-server debug watchDoc DOCKEY [--projectName <value>]

FLAGS
  --projectName=<value>  [default: default]

DESCRIPTION
  Watch the update structure of a document
```

## `firesync-server help [COMMANDS]`

Display help for firesync-server.

```
USAGE
  $ firesync-server help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for firesync-server.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.4/src/commands/help.ts)_

## `firesync-server migrations migrate`

Run database migrations to set up correct schema

```
USAGE
  $ firesync-server migrations migrate

DESCRIPTION
  Run database migrations to set up correct schema
```

## `firesync-server migrations rollback`

Rollback the latest migration

```
USAGE
  $ firesync-server migrations rollback

DESCRIPTION
  Rollback the latest migration
```

## `firesync-server migrations seed`

Seed database with default project

```
USAGE
  $ firesync-server migrations seed

DESCRIPTION
  Seed database with default project
```

## `firesync-server server`

Run the firesync server

```
USAGE
  $ firesync-server server [-h <value>] [-p <value>] [--debug-danger-do-not-use-in-production]

FLAGS
  -h, --host=<value>                       [default: localhost] Host to bind to
  -p, --port=<value>                       [default: 5000] Port to bind to
  --debug-danger-do-not-use-in-production  Enable debug router

DESCRIPTION
  Run the firesync server
```

## `firesync-server setup`

```
USAGE
  $ firesync-server setup
```
<!-- commandsstop -->
