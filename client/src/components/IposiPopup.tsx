import { Check, TriangleAlert, X } from 'lucide-react';
import { usePopup } from '@/store/popupStore';

const ICON = {
  error: <X size={30} />,
  success: <Check size={30} />,
  warning: <TriangleAlert size={26} />,
};

export function IposiPopup() {
  const { open, title, message, type, close } = usePopup();
  if (!open) return null;

  return (
    <div className="popup-overlay" onMouseDown={close}>
      <div className="popup-box" onMouseDown={(e) => e.stopPropagation()}>
        <div className={`popup-icon ${type}`}>{ICON[type]}</div>
        <h3 className="popup-title">{title}</h3>
        <p className="popup-msg">{message}</p>
        <button className={`popup-btn ${type}`} onClick={close} autoFocus>
          OK
        </button>
      </div>
    </div>
  );
}
