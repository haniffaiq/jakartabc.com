import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PricingTable as ExportedPricingTable } from '../index'
import { PricingTable } from './PricingTable'

const rows = [
  { label: 'PT PMA incorporation', govFee: 2_500_000, ourFee: 18_000_000 },
  { label: 'KBLI classification & OSS', govFee: 0, ourFee: 4_000_000 },
]

const headers = {
  service: 'Service',
  govFee: 'Gov. fee',
  ourFee: 'Our fee',
  total: 'Total',
}

describe('PricingTable', () => {
  it('renders rows with tabular-nums and per-row totals', () => {
    render(
      <PricingTable
        headers={headers}
        currency="IDR"
        rows={rows}
        totalLabel="Starter package"
      />,
    )

    expect(screen.getByText('PT PMA incorporation')).toBeInTheDocument()
    expect(screen.getByText('KBLI classification & OSS')).toBeInTheDocument()

    const table = screen.getByRole('table')
    expect(table.className).toMatch(/tabular-nums/)

    const bodyRows = within(table).getAllByRole('row')
    const firstDataRow = bodyRows[1]
    const secondDataRow = bodyRows[2]
    expect(firstDataRow).toBeDefined()
    expect(secondDataRow).toBeDefined()
    expect(within(firstDataRow as HTMLTableRowElement).getByText('20,500,000 IDR')).toBeInTheDocument()
    expect(within(secondDataRow as HTMLTableRowElement).getAllByText('4,000,000 IDR')).toHaveLength(2)
  })

  it('renders an editorial total row with the sum of all fees', () => {
    render(
      <PricingTable
        headers={headers}
        currency="IDR"
        rows={rows}
        totalLabel="Starter package"
      />,
    )

    const totalRow = screen.getByText('Starter package').closest('tr')
    expect(totalRow).not.toBeNull()
    expect(within(totalRow as HTMLTableRowElement).getByText('24,500,000 IDR')).toBeInTheDocument()
    expect(totalRow?.className).toMatch(/border-ochre-600/)
  })

  it('exports PricingTable from the package entrypoint', () => {
    expect(ExportedPricingTable).toBe(PricingTable)
  })
})
