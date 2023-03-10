import { Modal } from 'bootstrap'
import { useCallback, useEffect, useState } from 'react'

type ModalProps = {
  show: boolean
  onVisibilityChange?: (visible: boolean) => void
}

export function ShareModal({ show, onVisibilityChange }: ModalProps) {
  // TODO: Use react-bootstrap to avoid all this modal boiler plate?
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const [modal, setModal] = useState<Modal | null>(null)
  const initModal = useCallback((node: HTMLDivElement) => {
    setNode(node)
    setModal(new Modal(node))
  }, [])

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
    <div className="modal" ref={initModal}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Modal title</h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p>Modal body text goes here.</p>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              data-bs-dismiss="modal">
              Close
            </button>
            <button type="button" className="btn btn-primary">
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
