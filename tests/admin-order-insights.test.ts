import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeOrderDashboard } from '../src/lib/admin-order-insights.ts'

test('empty dataset has honest zero values without divide-by-zero', () => {
  const result = summarizeOrderDashboard([])
  assert.equal(result.total, 0)
  assert.equal(result.metrics.pipelineValue, 0)
  assert.equal(result.averageRequest, 0)
  assert.ok(result.stages.every(stage => stage.width === 0 && stage.count === 0))
})

test('dashboard stages, deposit followups and pipeline only count relevant orders', () => {
  const result = summarizeOrderDashboard([
    { status: 'new', paymentStatus: 'unpaid', estimatedTotal: 600 },
    { status: 'confirmed', paymentStatus: 'deposit-pending', estimatedTotal: 1200 },
    { status: 'preparing', paymentStatus: 'deposit-paid', confirmedTotal: 800 },
    { status: 'completed', paymentStatus: 'paid', confirmedTotal: 900 },
    { status: 'cancelled', paymentStatus: 'unpaid', confirmedTotal: 10000 },
  ])
  assert.deepEqual(result.metrics, {
    active: 3,
    newOrders: 1,
    awaitingDeposit: 2,
    pipelineValue: 2600,
  })
  assert.equal(result.total, 5)
  assert.equal(result.averageRequest, 875)
  assert.equal(result.stages.find(stage => stage.status === 'completed')?.count, 1)
  assert.equal(result.stages.reduce((sum, stage) => sum + stage.count, 0), 4)
})

test('amounts sanitise invalid data, preserve confirmed zero, and never misreport revenue', () => {
  const result = summarizeOrderDashboard([
    { status: 'new', paymentStatus: 'unpaid', estimatedTotal: Number.POSITIVE_INFINITY },
    { status: 'confirmed', paymentStatus: 'unpaid', estimatedTotal: -125 },
    { status: 'confirmed', paymentStatus: 'deposit-paid', estimatedTotal: 500, confirmedTotal: 0 },
    { status: 'completed', paymentStatus: 'paid', estimatedTotal: Number.NaN },
  ])
  assert.equal(result.metrics.pipelineValue, 0)
  assert.equal(result.metrics.awaitingDeposit, 2)
  assert.equal(result.averageRequest, 0)
  assert.ok(Number.isFinite(result.averageRequest))
})

test('stage bars scale relative to largest count and hide empty stages', () => {
  const result = summarizeOrderDashboard([
    ...Array.from({ length: 4 }, () => ({ status: 'new' })),
    { status: 'ready' },
  ])
  assert.equal(result.stages.find(stage => stage.status === 'new')?.width, 100)
  assert.equal(result.stages.find(stage => stage.status === 'ready')?.width, 25)
  assert.equal(result.stages.find(stage => stage.status === 'confirmed')?.width, 0)
})
