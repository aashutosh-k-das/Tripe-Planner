import React, { useEffect, useRef } from 'react';
import { X, Clock, MapPin, Info } from 'lucide-react';

export default function StopModal({ stop, destination, onClose }) {
  const dialogRef = useRef(null);

  // Handle native dialog show/close based on the 'stop' prop
  useEffect(() => {
    if (stop && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (!stop && dialogRef.current) {
      dialogRef.current.close();
    }
  }, [stop]);

  // Fallback for browsers that don't support the 'closedby' attribute yet
  // This allows clicking outside the dialog to close it (light-dismiss)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        onClose();
      }
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => dialog.removeEventListener('click', handleBackdropClick);
  }, [onClose]);

  if (!stop) return null;

  // Generate a free google maps embed URL based on the stop name and destination city
  const mapQuery = encodeURIComponent(`${stop.name}, ${destination || ''}`);
  const mapUrl = `https://maps.google.com/maps?q=${mapQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <dialog 
      ref={dialogRef}
      onClose={onClose}
      style={{
        padding: 0,
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          padding: '24px 24px 16px 24px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div>
            <h2 className="title-font" style={{ margin: '0 0 12px 0', fontSize: '1.75rem', fontWeight: 700 }}>
              {stop.name}
            </h2>
            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> {stop.time}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'capitalize' }}>
                <MapPin size={16} /> {stop.category}
              </span>
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={onClose}
            style={{ 
              background: 'none', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            aria-label="Close modal"
            onMouseOver={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = '#f1f5f9';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'none';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <div style={{ 
            background: '#ede9fe', 
            border: '1px solid #c4b5fd', 
            borderRadius: 'var(--radius-md)', 
            padding: '16px',
            display: 'flex',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <Info size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
              {stop.notes}
            </p>
          </div>

          {/* Map View */}
          <div style={{ 
            width: '100%', 
            height: '250px', 
            borderRadius: 'var(--radius-md)', 
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-page)',
            position: 'relative'
          }}>
            <iframe 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no" 
              marginHeight="0" 
              marginWidth="0" 
              src={mapUrl}
              title={`Map showing location of ${stop.name}`}
              style={{ 
                display: 'block'
              }}
            ></iframe>
          </div>
        </div>

      </div>
    </dialog>
  );
}
