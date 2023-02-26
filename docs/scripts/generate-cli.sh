#!/bin/bash

# Automatically generate the CLI docs from the output of oclif readme.
# oclif readme command expects to operate on a file called README.md in the current directory,
# so swap out our template for the firesync-server README.md first, generate the docs,
# move it into docusaurus then put the original README.md back...

set -ex

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
FIRESYNC_DIR=$SCRIPT_DIR/../..
FIRESYNC_SERVER_DIR=$FIRESYNC_DIR/firesync-server
DOCS_DIR=$FIRESYNC_DIR/docs/docs/reference/firesync-server

cd $FIRESYNC_SERVER_DIR && mv README.md README.md.orig

cp $DOCS_DIR/cli.md.template $FIRESYNC_SERVER_DIR/README.md

cd $FIRESYNC_DIR/firesync-server && npx oclif readme

mv $FIRESYNC_SERVER_DIR/README.md $DOCS_DIR/cli.md

cd $FIRESYNC_SERVER_DIR && mv README.md.orig README.md
