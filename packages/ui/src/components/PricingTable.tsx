import * as React from 'react'

import { cn } from '../lib/cn'

export type PricingRow = {
  label: string
  govFee: number
  ourFee: number
}

export type PricingTableProps = {
  headers: {
    service: string
    govFee: string
    ourFee: string
    total: string
  }
  rows: PricingRow[]
  currency: string
  totalLabel: string
  className?: string
} & Omit<React.ComponentPropsWithoutRef<'table'>, 'className' | 'children'>

function formatAmount(amount: number, currency: string) {
  return `${new Intl.NumberFormat('en-US').format(amount)} ${currency}`
}

export function PricingTable({
  headers,
  rows,
  currency,
  totalLabel,
  className,
  ...rest
}: PricingTableProps) {
  const total = rows.reduce((sum, row) => sum + row.govFee + row.ourFee, 0)

  return (
    <div className="overflow-x-auto">
      <table
        className={cn('w-full min-w-[720px] border-collapse font-body tabular-nums text-body-md', className)}
        {...rest}
      >
        <thead>
          <tr className="border-b border-ink-900/15">
            <th scope="col" className="py-3 pr-6 text-left text-eyebrow uppercase tracking-[0.08em] text-ink-700">
              {headers.service}
            </th>
            <th scope="col" className="px-6 py-3 text-right text-eyebrow uppercase tracking-[0.08em] text-ink-700">
              {headers.govFee}
            </th>
            <th scope="col" className="px-6 py-3 text-right text-eyebrow uppercase tracking-[0.08em] text-ink-700">
              {headers.ourFee}
            </th>
            <th scope="col" className="py-3 pl-6 text-right text-eyebrow uppercase tracking-[0.08em] text-ink-700">
              {headers.total}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.label}
              className={cn('border-b border-ink-900/[0.08]', index % 2 === 1 && 'bg-bone-100')}
            >
              <th scope="row" className="py-4 pr-6 text-left font-normal text-ink-900">
                {row.label}
              </th>
              <td className="px-6 py-4 text-right text-ink-700">{formatAmount(row.govFee, currency)}</td>
              <td className="px-6 py-4 text-right text-ink-700">{formatAmount(row.ourFee, currency)}</td>
              <td className="py-4 pl-6 text-right text-ink-900">
                {formatAmount(row.govFee + row.ourFee, currency)}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-ochre-600">
            <th scope="row" className="py-4 pr-6 text-left font-medium text-ink-900">
              {totalLabel}
            </th>
            <td colSpan={2} className="px-6 py-4" />
            <td className="py-4 pl-6 text-right font-medium text-ochre-700 underline decoration-ochre-600 decoration-2 underline-offset-4">
              {formatAmount(total, currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
