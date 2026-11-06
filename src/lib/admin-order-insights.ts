/** Pure, testable calculations for the manager's order snapshot. */
export type OrderSnapshot = {
  status: string
  paymentStatus?: string | null
  estimatedTotal?: number | null
  confirmedTotal?: number | null
}

export const ORDER_STAGE_LABELS = [
  { status: 'new', label: 'New' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'deposit-paid', label: 'Deposit paid' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'ready', label: 'Ready' },
  { status: 'completed', label: 'Completed' },
] as const

function safeAmount(value: number | null | undefined) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function orderAmount(order: OrderSnapshot) {
  return safeAmount(order.confirmedTotal ?? order.estimatedTotal)
}

/**
 * Pipeline excludes completed/cancelled orders; estimates are not bank receipts.
 * Unknown or invalid financial values cannot become NaN or negative balances.
 */
export function summarizeOrderDashboard(orders: readonly OrderSnapshot[]) {
  const active = orders.filter(order => !['completed', 'cancelled'].includes(order.status))
  const eligible = orders.filter(order => order.status !== 'cancelled')
  const valued = eligible.filter(order => order.confirmedTotal != null || order.estimatedTotal != null)
  const awaitingDeposit = active.filter(order => ['unpaid', 'deposit-pending'].includes(order.paymentStatus || 'unpaid')).length

  const stageCounts = ORDER_STAGE_LABELS.map(stage => ({
    ...stage,
    count: orders.filter(order => order.status === stage.status).length,
  }))
  const peak = Math.max(1, ...stageCounts.map(stage => stage.count))
  return {
    total: orders.length,
    averageRequest: valued.length
      ? valued.reduce((total, order) => total + orderAmount(order), 0) / valued.length
      : 0,
    stages: stageCounts.map(stage => ({
      ...stage,
      width: stage.count === 0 ? 0 : Math.max(7, Math.round(stage.count * 100 / peak)),
    })),
    metrics: {
      active: active.length,
      newOrders: orders.filter(order => order.status === 'new').length,
      awaitingDeposit,
      pipelineValue: active.reduce((total, order) => total + orderAmount(order), 0),
    },
  }
}
