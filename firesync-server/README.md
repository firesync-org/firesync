# Firesync Server

## Getting Started

Start the server, using nodemon to reload it when changes happen:

```
npm install
npm run start
```

## Testing

With the server running as above, run the end to end tests against it:

```
npm run test
```

## Migrations

```
npx knex --knexfile src/db/knexfile.ts migrate:make name_of_migration
```
