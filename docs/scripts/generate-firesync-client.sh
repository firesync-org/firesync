#!/bin/bash

# Automatically generate the firesync-client docs from the JSDoc comments

set -ex

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
FIRESYNC_DIR=$SCRIPT_DIR/../..
FIRESYNC_CLIENT_DIR=$FIRESYNC_DIR/firesync-client
DOCS_DIR=$FIRESYNC_DIR/docs/docs/reference/firesync-client

cd $FIRESYNC_CLIENT_DIR && (
cat $DOCS_DIR/_firesync-client-header.md > $DOCS_DIR/firesync-client.md
npx jsdoc2md --files src/firesync.ts --configure jsdoc.json >> $DOCS_DIR/firesync-client.md
)
