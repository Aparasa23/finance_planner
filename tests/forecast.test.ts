import { describe, it, expect } from 'vitest'
import { generateCashFlowForecast } from '../src/lib/forecast/engine'

describe('Cash Flow Forecasting Engine', () => {
  it('generates a daily cash projection list with inflow/outflow properties in Sandbox mode', async () => {
    const result = await generateCashFlowForecast('demo_household_id', 30)

    expect(result).toBeDefined()
    expect(result.forecast).toBeInstanceOf(Array)
    expect(result.forecast.length).toBeGreaterThan(0)

    // Check data point schema integrity
    const point = result.forecast[0]
    expect(point).toHaveProperty('date')
    expect(point).toHaveProperty('balance')
    expect(point).toHaveProperty('inflow')
    expect(point).toHaveProperty('outflow')
    expect(point).toHaveProperty('overdraftAlert')
  })
})
