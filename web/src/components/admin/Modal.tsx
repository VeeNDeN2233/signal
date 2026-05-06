import React from 'react';
interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}
export function Modal({ title, onClose, children }: ModalProps) {
    return (<div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>{title}</h3>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>{children}</div>
      </div>
    </div>);
}
const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
};
const dialogStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 8,
    minWidth: 400,
    maxWidth: 560,
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};
const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid #e2e8f0',
};
const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#64748b',
    lineHeight: 1,
};
