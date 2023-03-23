import { Modal as BootstrapModal } from 'bootstrap'
import { PropsWithChildren, useCallback, useEffect, useState } from 'react'

export type ModalProps = {
  show: boolean
  onVisibilityChange?: (visible: boolean) => void
}

export function Modal({
  show,
  onVisibilityChange,
  children
}: PropsWithChildren<ModalProps>) {
  // TODO: Use react-bootstrap to avoid all this modal boiler plate?
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const [modal, setModal] = useState<BootstrapModal | null>(null)
  const initModal = useCallback((node: HTMLDivElement | null) => {
    setNode(node)
    setModal(node ? new BootstrapModal(node) : null)
  }, [])

  useEffect(() => {
    return () => {
      if (modal) modal.dispose()
    }
  }, [modal])

  useEffect(() => {
    if (!modal) return
    if (show) {
      modal.show()
    } else {
      modal.hide()
    }
  }, [show, modal])

  useEffect(() => {
    if (!node) return
    if (onVisibilityChange) {
      const shownCb = () => onVisibilityChange(true)
      const hiddenCb = () => onVisibilityChange(false)
      node.addEventListener('shown.bs.modal', shownCb)
      node.addEventListener('hidden.bs.modal', hiddenCb)

      return () => {
        node.removeEventListener('shown.bs.modal', shownCb)
        node.removeEventListener('hidden.bs.modal', hiddenCb)
      }
    }
  }, [node, onVisibilityChange])

  return (
    <div className="modal modal-lg" ref={initModal}>
      <div className="modal-dialog">
        <div className="modal-content">{children}</div>
      </div>
    </div>
  )
}
