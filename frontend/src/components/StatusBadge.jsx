import { useLanguage } from '../context/LanguageContext';

// A small colored label that shows an incident status.
function StatusBadge({ status }) {
  const { t } = useLanguage();
  // "In Progress" becomes "In-Progress" so it matches the CSS class name
  const cssName = status.replace(/ /g, '-');
  const translated = {
    Reported: t('reportedStatus'),
    Verified: t('verifiedStatus'),
    Rejected: t('rejectedStatus'),
    Assigned: t('assignedStatus'),
    'In Progress': t('inProgressStatus'),
    Pending: t('pendingStatus'),
    Completed: t('completedStatus'),
    Closed: t('closedStatus'),
  }[status] || status;

  return <span className={`badge badge-${cssName}`}>{translated}</span>;
}

export default StatusBadge;