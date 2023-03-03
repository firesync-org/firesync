## Database migrations

### New migration

```
npx knex --knexfile src/db/knexfile.ts migrate:make migration_name
```

### Running migrations

```
./bin/firesync-server-dev migrations migrate
```
