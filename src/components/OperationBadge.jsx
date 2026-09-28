import { getQuestOperation } from '../utils/operations'

/**
 * The one required functional change from the v4 brief: every quest
 * card shows the Operation it belongs to, as a glowing badge.
 * Color comes from the Operation itself (see utils/operations.js);
 * the glow reuses the app's existing color-mix + box-shadow pattern
 * rather than inventing a new visual language.
 */
export default function OperationBadge({ quest, className = '' }) {
  const op = getQuestOperation(quest)
  const Icon = op.icon
  return (
    <span
      className={`badge badge-operation ${className}`}
      data-operation={op.id}
      style={{ '--op-color': op.color, color: op.color, background: `${op.color}1a`, borderColor: `${op.color}55` }}
    >
      <Icon size={10} /> Operation {op.name}
    </span>
  )
}
