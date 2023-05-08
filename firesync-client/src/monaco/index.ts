import { MonacoBinding } from 'y-monaco'
import { FireSync } from '../firesync'
import { Y } from '../y'
import { Awareness } from 'y-protocols/awareness'
import { UnexpectedInternalStateError } from '../shared/errors'

/**
 * Options for FireSyncMonacoBinding
 * @typedef FireSyncMonacoBindingOptions
 * @type {object}
 * @param {boolean} [cursors=true] Show cursors and names of other connected clients.
 * The name and color can be set with `firesync.setUserDisplayName` and `firesync.setUserColor`
 * on each client
 * @param {string} [textKey=default] The key to use to get a Y.Text instance from the Y.Doc.
 * The Monaco editor is synced to the Y.Text instance at ydoc.getText(textKey)
 * @param {Y.Text} [ytext] A Y.Text instance to bind to the Monaco editor. This is useful for
 * Y.Text instances that are nested within your Y.Doc.
 * @param {Awareness} [awareness] An existing Awareness instance to use for sharing cursor location
 * and names between connected clients.
 * @param {string} [initialValue] An initial value to set on the Y.Text instance. See the `initialize`
 * function in [SubscribeYDocOptions](/reference/firesync-client/#subscribeydocoptions--object) for
 * more information.

 * @example
 * ```js
 * // Example with custom Y.Text instance nested with Y.Doc:
 * const ydoc = firesync.subscribeYDoc('my-doc-key')
 * const ytext = new Y.Text()
 * // Y.Text instance must be part of doc
 * ydoc.getMap('foo').set('bar', ytext)
 * new FireSyncMonacoBinding(firesync, 'my-doc-key', editor, {
 *   ytext: ytext,
 *   initialValue: 'Hello world',
 *   cursors: false
 * })
 * ```
 */
type FireSyncMonacoBindingOptions = {
  cursors?: boolean
  textKey?: string
  ytext?: Y.Text
  awareness?: Awareness
  initialValue?: string
}

/**
 * @typicalname binding
 */
export class FireSyncMonacoBinding {
  monacoBinding: MonacoBinding
  onAwarenessChange?: () => void
  awareness?: Awareness

  /**
   * Create a new instance of FireSyncMonacoBinding to connect a Monaco editor instance
   * to a document that is synced via FireSync.
   *
   * @param {FireSync} firesync A FireSync instance
   * @param {string} docKey The key of the document to bind the Monaco editor to
   * @param {IStandaloneCodeEditor} editor A Monaco editor instance
   * @param {FireSyncMonacoBindingOptions} [options] Configuration options
   *
   * @example
   * ```js
   * import { FireSyncMonacoBinding } from '@firesync/client/monaco'
   *
   * const editor = monaco.editor.create(document.getElementById('monaco-editor'), {
   *   value: '', // Gets overwritten when FireSync doc syncs
   *   language: "javascript"
   * })
   * const binding = new FireSyncMonacoBinding(firesync, 'my-doc-key', editor)
   * ```
   */
  constructor(
    firesync: FireSync,
    docKey: string,
    editor: any,
    {
      cursors = true,
      textKey = 'default',
      ytext,
      awareness,
      initialValue
    }: FireSyncMonacoBindingOptions = {}
  ) {
    ytext = this.subscribeYText(firesync, docKey, textKey, ytext, initialValue)

    if (cursors) {
      this.updateCss()
      this.awareness = firesync.subscribeAwareness(docKey, { awareness })
      this.onAwarenessChange = () => this.updateCss()
      this.awareness.on('change', this.onAwarenessChange)
    }

    this.monacoBinding = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      this.awareness
    )
  }

  /**
   * Remove the connection between the Monaco editor and the FireSync document
   */
  destroy() {
    this.monacoBinding.destroy()
    if (this.awareness && this.onAwarenessChange) {
      this.awareness.off('change', this.onAwarenessChange)
    }
  }

  private subscribeYText(
    firesync: FireSync,
    docKey: string,
    textKey: string,
    ytext: Y.Text | undefined,
    initialValue?: string
  ) {
    const initialize = initialValue
      ? () => {
          if (!ytext) {
            // ytext should be initialized by the time this is called with the logic
            // below
            throw new UnexpectedInternalStateError('Expected ytext to exist')
          }
          ytext.insert(0, initialValue)
        }
      : undefined

    if (ytext) {
      if (!ytext.doc) {
        throw new Error('ytext instance should be part of a Y.Doc')
      }
      firesync.subscribeYDoc(docKey, { ydoc: ytext.doc, initialize })
    } else {
      const ydoc = firesync.subscribeYDoc(docKey, { initialize })
      ytext = ydoc.getText(textKey)
    }

    return ytext
  }

  private cssEl?: HTMLElement
  private updateCss() {
    if (!this.cssEl) {
      this.cssEl = document.createElement('style')
      document.head.appendChild(this.cssEl)
    }

    const userStates = Array.from(this.awareness?.getStates().entries() || [])
    const userCss = userStates.map(([clientId, data]) => {
      const user = data?.user

      // Validate color to prevent CSS escaping issues
      let color: string
      if (CSS.supports('color', user?.color)) {
        color = user.color
      } else {
        color = 'red'
      }

      const name = CSS.escape(user?.name || '')

      return {
        clientId,
        color,
        name
      }
    })

    this.cssEl.innerHTML = `
      .yRemoteSelection {
        background-color: var(--user-color);
        opacity: 0.4;
      }
      .yRemoteSelectionHead {
        position: absolute;
        border-left: var(--user-color) solid 2px;
        border-top: var(--user-color) solid 2px;
        border-bottom: var(--user-color) solid 2px;
        height: 100%;
        box-sizing: border-box;
      }
      .yRemoteSelectionHead::after {
        position: absolute;
        content: ' ';
        border: 3px solid var(--user-color);
        border-radius: 4px;
        left: -4px;
        top: -5px;
      }
      .yRemoteSelectionHead:hover::before {
        position: absolute;
        content: var(--user-name);
        color: white;
        padding: 2px 6px;
        border: 3px solid var(--user-color);
        background-color: var(--user-color);
        border-radius: 4px;
        left: -4px;
        bottom: calc(100%);
      }

      ${userCss
        .map(
          ({ clientId, color, name }) => `
            .yRemoteSelection-${clientId}, .yRemoteSelectionHead-${clientId} {
              --user-color: ${color};
              --user-name: '${name}';
            }
          `
        )
        .join('\n')}
    `
  }
}
