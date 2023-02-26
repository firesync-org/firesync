#!/bin/bash
set -ex
(
  cd ../firesync-client &&
  ([ ! -e firesync-client-*.tgz  ] || rm firesync-client-*.tgz) && 
  npm run build &&
  npm pack .
)
npm install ../firesync-client/firesync-client-*.tgz

(
  cd ../firesync-server &&
  ([ ! -e firesync-server-*.tgz  ] || rm firesync-server-*.tgz) && 
  npm run build &&
  npm pack .
)
npm install ../firesync-server/firesync-server-*.tgz
