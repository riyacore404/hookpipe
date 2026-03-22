import { describe, it, expect } from 'vitest'
import { evaluateRule, shouldDeliver } from '../src/services/filter.service.js'

describe('evaluateRule', () => {

  it('equals — matches exact value', () => {
    expect(evaluateRule(
      { type: 'payment.success' },
      { field: 'type', operator: 'equals', value: 'payment.success' }
    )).toBe(true)
  })

  it('equals — rejects different value', () => {
    expect(evaluateRule(
      { type: 'payment.failed' },
      { field: 'type', operator: 'equals', value: 'payment.success' }
    )).toBe(false)
  })

  it('contains — matches substring', () => {
    expect(evaluateRule(
      { type: 'payment.success' },
      { field: 'type', operator: 'contains', value: 'payment' }
    )).toBe(true)
  })

  it('gt — passes when field value is greater', () => {
    expect(evaluateRule(
      { amount: 1000 },
      { field: 'amount', operator: 'gt', value: '500' }
    )).toBe(true)
  })

  it('lt — fails when field value is greater', () => {
    expect(evaluateRule(
      { amount: 1000 },
      { field: 'amount', operator: 'lt', value: '500' }
    )).toBe(false)
  })

  it('nested field path — resolves dot notation', () => {
    expect(evaluateRule(
      { data: { amount: 500 } },
      { field: 'data.amount', operator: 'gt', value: '100' }
    )).toBe(true)
  })

  it('exists — true when field present', () => {
    expect(evaluateRule(
      { type: 'payment.success' },
      { field: 'type', operator: 'exists', value: '' }
    )).toBe(true)
  })

  it('not_exists — true when field absent', () => {
    expect(evaluateRule(
      { type: 'payment.success' },
      { field: 'missing_field', operator: 'not_exists', value: '' }
    )).toBe(true)
  })
})

describe('shouldDeliver', () => {

  it('returns true when no rules — always deliver', () => {
    expect(shouldDeliver({ type: 'anything' }, [])).toBe(true)
  })

  it('returns true when all rules pass', () => {
    expect(shouldDeliver(
      { type: 'payment.success', amount: 1000 },
      [
        { field: 'type', operator: 'equals', value: 'payment.success' },
        { field: 'amount', operator: 'gt', value: '500' },
      ]
    )).toBe(true)
  })

  it('returns false when any rule fails — AND logic', () => {
    expect(shouldDeliver(
      { type: 'payment.success', amount: 100 },
      [
        { field: 'type', operator: 'equals', value: 'payment.success' },
        { field: 'amount', operator: 'gt', value: '500' },  // fails
      ]
    )).toBe(false)
  })
})