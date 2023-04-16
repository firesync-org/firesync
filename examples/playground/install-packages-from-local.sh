#!/bin/bash
set -ex

# Don't update package.json with local versions - this is just for dev
cp package.json package.json.bak
cp package-lock.json package-lock.json.bak

(
  cd ../../firesync-client &&
  ([ ! -e firesync-client-*.tgz  ] || rm firesync-client-*.tgz) && 
  npm run build &&
  npm pack .
)
npm install ../../firesync-client/firesync-client-*.tgz

(
  cd ../../firesync-server &&
  ([ ! -e firesync-server-*.tgz  ] || rm firesync-server-*.tgz) && 
  npm run build &&
  npm pack .
)
npm install ../../firesync-server/firesync-server-*.tgz

mv package.json.bak package.json
mv package-lock.json.bak package-lock.json
