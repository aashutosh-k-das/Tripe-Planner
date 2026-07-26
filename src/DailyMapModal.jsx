import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react';

export default function DailyMapModal({ dayData, destination, onClose }) {
  const [loading, setLoading] = useState(true);

  // Close on Escape key
  useEffect(() => {
    if (!dayData) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [dayData, onClose]);

  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (dayData) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [dayData]);

  if (!dayData) return null;

  const stops = dayData.stops || [];
  if (stops.length === 0) return null;

  // Build the Directions URL
  let mapUrl = '';
  let query = '';

  if (stops.length === 1) {
    query = `${stops[0].name}, ${destination}`;
    mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  } else {
    // For multiple stops, we use saddr (start address) and daddr (destination address)
    const saddr = encodeURIComponent(`${stops[0].name}, ${destination}`);
    
    // The daddr consists of the last stop, but we can chain waypoints using +to:
    let daddrParts = [];
    for (let i = 1; i < stops.length; i++) {
      daddrParts.push(encodeURIComponent(`${stops[i].name}, ${destination}`));
    }
    const daddr = daddrParts.join('+to:');
    
    mapUrl = `https://maps.google.com/maps?saddr=${saddr}&daddr=${daddr}&output=embed`;
  }

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div 
        className="modal-content animate-slide-up" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '800px', width: '90%' }}
      >
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 16px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Day {dayData.day} Route Map
            </h3>
            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <span>{stops.length} Stops</span>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Map Container */}
        <div style={{ padding: '24px', position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)' }}>
              <Loader2 size={32} className="animate-spin-slow" style={{ color: 'var(--primary-color)' }} />
            </div>
          )}
          
          <iframe
            title={`Day ${dayData.day} Route Map`}
            width="100%"
            height="400"
            style={{ border: 0, borderRadius: 'var(--radius-md)', background: 'var(--bg-page)' }}
            loading="lazy"
            allowFullScreen
            src={mapUrl}
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}
