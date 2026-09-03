export const StatusPill = ({ status }) => {
  if (!status) return null;
  const s = String(status).toUpperCase();

  let className = 'status-pill default';
  if (s === 'BOOKED' || s === 'SCHEDULED' || s === 'COMPLETED') className = 'status-pill success';
  if (s === 'WAITLISTED' || s === 'EXPIRING_SOON') className = 'status-pill warning';
  if (s === 'CANCELLED' || s === 'NO_SHOW' || s === 'EXPIRED') className = 'status-pill danger';
  if (s === 'ATTENDED') className = 'status-pill info';

  return <span className={className}>{s.replace('_', ' ')}</span>;
};
