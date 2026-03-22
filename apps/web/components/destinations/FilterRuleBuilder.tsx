'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { filterRulesApi, type FilterRule } from '@/lib/api'

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
  { value: 'exists', label: 'exists' },
  { value: 'not_exists', label: 'does not exist' },
]

// operators that don't need a value input
const NO_VALUE_OPERATORS = ['exists', 'not_exists']

type Props = { destinationId: string }

export default function FilterRuleBuilder({ destinationId }: Props) {
  const queryClient = useQueryClient()
  const [field, setField] = useState('')
  const [operator, setOperator] = useState('equals')
  const [value, setValue] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: rules } = useQuery({
    queryKey: ['filter-rules', destinationId],
    queryFn: () => filterRulesApi.list(destinationId).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => filterRulesApi.create({ destinationId, field, operator, value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filter-rules', destinationId] })
      setField('')
      setOperator('equals')
      setValue('')
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filterRulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filter-rules', destinationId] })
    },
  })

  const needsValue = !NO_VALUE_OPERATORS.includes(operator)

  return (
    <div className="mt-3">

      {/* existing rules */}
      {rules && rules.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {rules.map((rule: FilterRule) => (
            <div
              key={rule.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs"
            >
              <span className="font-mono text-blue-700">{rule.field}</span>
              <span className="text-blue-400">{rule.operator}</span>
              {rule.value && (
                <span className="font-mono text-blue-700">{rule.value}</span>
              )}
              <button
                onClick={() => deleteMutation.mutate(rule.id)}
                className="ml-auto text-blue-300 hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* add rule form */}
      {showForm ? (
        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="field (e.g. type or data.amount)"
              value={field}
              onChange={e => setField(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400 font-mono"
            />
            <select
              value={operator}
              onChange={e => setOperator(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
            >
              {OPERATORS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            {needsValue && (
              <input
                type="text"
                placeholder="value"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400 font-mono"
              />
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!field || createMutation.isPending}
              className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Adding...' : 'Add rule'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-xs text-blue-500 hover:underline"
        >
          + Add filter rule
        </button>
      )}

      {rules && rules.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 mt-1">
          No filters — all events delivered
        </p>
      )}
    </div>
  )
}