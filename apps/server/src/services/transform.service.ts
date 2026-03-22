// deep clone a payload so we never mutate the original
function deepClone(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj))
}

// safely set a nested value using dot notation
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const keys = path.split('.')
  const last = keys.pop()!
  let current = obj

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  current[last] = value
}

// safely delete a nested key using dot notation
function deleteNestedValue(
  obj: Record<string, unknown>,
  path: string
): void {
  const keys = path.split('.')
  const last = keys.pop()!
  let current: unknown = obj

  for (const key of keys) {
    if (!current || typeof current !== 'object') return
    current = (current as Record<string, unknown>)[key]
  }

  if (current && typeof current === 'object') {
    delete (current as Record<string, unknown>)[last]
  }
}

// safely get a nested value using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

export type TransformRule = {
  type: 'rename' | 'strip' | 'add'
  field: string        // source field (for rename/strip) or target field (for add)
  value?: string       // new field name (for rename) or static value (for add)
}

// apply a list of transform rules to a payload
// returns a new transformed payload — original is never mutated
export function applyTransforms(
  payload: Record<string, unknown>,
  rules: TransformRule[]
): Record<string, unknown> {
  // deep clone so we never mutate the original stored payload
  const result = deepClone(payload) as Record<string, unknown>

  for (const rule of rules) {
    switch (rule.type) {
      case 'rename': {
        // rename: move field value to new key, delete old key
        if (!rule.value) break
        const val = getNestedValue(result, rule.field)
        if (val !== undefined) {
          setNestedValue(result, rule.value, val)
          deleteNestedValue(result, rule.field)
        }
        break
      }

      case 'strip': {
        // strip: remove the field entirely
        deleteNestedValue(result, rule.field)
        break
      }

      case 'add': {
        // add: inject a static field — useful for adding metadata
        // e.g. add { field: 'source', value: 'hookpipe' }
        if (rule.value !== undefined) {
          setNestedValue(result, rule.field, rule.value)
        }
        break
      }
    }
  }

  return result
}