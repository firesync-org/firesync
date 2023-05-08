import React, { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import { useFireSync, useUniqueDocKey } from '../firesync'
import { FireSyncMonacoBinding } from '@firesync/client/monaco'
import { editor } from 'monaco-editor'
import '../css/monaco.css'

type MonacoEditorProps = {
  docKey: string
  initialValue: string
}

export function MonacoEditor({
  docKey: partialDocKey,
  initialValue
}: MonacoEditorProps) {
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>()

  const firesync = useFireSync()
  const docKey = useUniqueDocKey(partialDocKey)

  useEffect(() => {
    if (!editor) return

    const binding = new FireSyncMonacoBinding(firesync, docKey, editor, {
      initialValue
    })

    return () => binding.destroy()
  }, [editor])

  return (
    <Editor height="200px" defaultLanguage="markdown" onMount={setEditor} />
  )
}
