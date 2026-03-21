type Status = 'pending' | 'success' | 'failed' | 'dead' | 'delivered'

const STYLES: Record<Status, string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  success:   'bg-green-50 text-green-700 border-green-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  failed:    'bg-red-50 text-red-700 border-red-200',
  dead:      'bg-gray-100 text-gray-600 border-gray-200',
}

const LABELS: Record<Status, string> = {
  pending:   'pending',
  success:   'delivered',
  delivered: 'delivered',
  failed:    'failed',
  dead:      'dead letter',
}

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`w-fit inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${STYLES[status] ?? STYLES.pending}`}>
      {LABELS[status] ?? status}
    </span>
  )
}