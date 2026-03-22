import type { FilterRule } from '@prisma/client'

// safely get a nested value from an object using dot notation
// e.g. getNestedValue({ data: { amount: 500 } }, 'data.amount') → 500
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

// coerce value to string for comparison
function toString(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val)
}

// coerce value to number for gt/lt comparisons
function toNumber(val: unknown): number {
  return Number(val)
}

// evaluate a single filter rule against a payload
// returns true if the event SHOULD be delivered (rule passes)
export function evaluateRule(
  payload: Record<string, unknown>,
  rule: Pick<FilterRule, 'field' | 'operator' | 'value'>
): boolean {
  const fieldValue = getNestedValue(payload, rule.field)

  switch (rule.operator) {
    case 'equals':
      return toString(fieldValue) === rule.value

    case 'not_equals':
      return toString(fieldValue) !== rule.value

    case 'contains':
      return toString(fieldValue).includes(rule.value)

    case 'not_contains':
      return !toString(fieldValue).includes(rule.value)

    case 'gt':
      return toNumber(fieldValue) > toNumber(rule.value)

    case 'lt':
      return toNumber(fieldValue) < toNumber(rule.value)

    case 'exists':
      return fieldValue !== undefined && fieldValue !== null

    case 'not_exists':
      return fieldValue === undefined || fieldValue === null

    default:
      // unknown operator — fail safe, don't deliver
      console.warn(`Unknown filter operator: ${rule.operator}`)
      return false
  }
}

// evaluate ALL rules for a destination
// ALL rules must pass — it's AND logic, not OR
// if no rules exist — always deliver (no filter = forward everything)
export function shouldDeliver(
  payload: Record<string, unknown>,
  rules: Pick<FilterRule, 'field' | 'operator' | 'value'>[]
): boolean {
  if (rules.length === 0) return true
  return rules.every(rule => evaluateRule(payload, rule))
}