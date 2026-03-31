'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi, type AlertRule } from '@/lib/api'

const METRICS = [
  { value: 'failure_rate',      label: 'Failure rate (%)' },
  { value: 'dead_letter_count', label: 'Dead letter count' },
]

const CHANNELS = [
  { value: 'slack', label: 'Slack' },
  { value: 'email', label: 'Email' },
]

type Props = { destinationId: string }

export default function AlertRuleBuilder({ destinationId }: Props) {
  const api = useApi()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    metric: 'failure_rate',
    operator: 'gt',
    threshold: 10,
    windowMinutes: 5,
    channel: 'slack',
    channelTarget: '',
  })

  const { data: rules } = useQuery({
    queryKey: ['alert-rules', destinationId],
    queryFn: () =>
      api.get<AlertRule[]>(`/api/alert-rules/destination/${destinationId}`).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<AlertRule>('/api/alert-rules', { destinationId, ...form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules', destinationId] })
      setShowForm(false)
      setForm({
        metric: 'failure_rate',
        operator: 'gt',
        threshold: 10,
        windowMinutes: 5,
        channel: 'slack',
        channelTarget: '',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/alert-rules/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['alert-rules', destinationId] }),
  })

  const inputClass = 'text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400 bg-white'

  return (
    <div className="mt-3 pt-3 border-t border-gray-50">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">
        Alert rules
      </p>

      {rules && rules.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-2">
          {rules.map((rule: AlertRule) => (
            <div
              key={rule.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg text-xs"
            >
              <span className="text-amber-700">
                {rule.metric === 'failure_rate' ? 'Failure rate' : 'Dead letters'}
                {' '}{rule.operator}{' '}{rule.threshold}
                {rule.metric === 'failure_rate' ? '%' : ''}
                {' '}in {rule.windowMinutes}m → {rule.channel}
              </span>
              <button
                onClick={() => deleteMutation.mutate(rule.id)}
                className="ml-auto text-amber-300 hover:text-red-400"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex gap-2 flex-wrap">
            <select
              value={form.metric}
              onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}
              className={inputClass}
            >
              {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select
              value={form.operator}
              onChange={e => setForm(f => ({ ...f, operator: e.target.value }))}
              className={inputClass}
            >
              <option value="gt">greater than</option>
              <option value="lt">less than</option>
            </select>
            <input
              type="number"
              value={form.threshold}
              onChange={e => setForm(f => ({ ...f, threshold: Number(e.target.value) }))}
              className={`${inputClass} w-16`}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              type="number"
              value={form.windowMinutes}
              onChange={e => setForm(f => ({ ...f, windowMinutes: Number(e.target.value) }))}
              className={`${inputClass} w-16`}
              placeholder="mins"
            />
            <span className="text-xs text-gray-400 self-center">min window →</span>
            <select
              value={form.channel}
              onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
              className={inputClass}
            >
              {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input
              type="text"
              value={form.channelTarget}
              onChange={e => setForm(f => ({ ...f, channelTarget: e.target.value }))}
              placeholder={form.channel === 'slack' ? 'Slack webhook URL' : 'email@example.com'}
              className={`${inputClass} flex-1`}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.channelTarget || createMutation.isPending}
              className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Adding...' : 'Add alert'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="text-xs text-amber-500 hover:underline"
        >
          + Add alert rule
        </button>
      )}
    </div>
  )
}