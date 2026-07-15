import { describe, it, expect } from 'vitest'
import { calculateAmortizationSchedule, projectExtraPaymentSavings } from '../src/lib/installment/amortization'

describe('Installment Loan Amortization math', () => {
  describe('calculateAmortizationSchedule', () => {
    it('calculates exact interest-free monthly splits (e.g. 0% APR BNPL)', () => {
      const result = calculateAmortizationSchedule(1200, 0, 12, '2026-07-14')

      expect(result.monthlyPayment).toBe(100.00)
      expect(result.totalInterest).toBe(0.00)
      expect(result.totalPayments).toBe(1200.00)
      expect(result.schedule.length).toBe(12)
      
      // Last period has 0 remaining principal
      expect(result.schedule[11].remainingPrincipal).toBe(0.00)
    })

    it('calculates correct interest values for interest-bearing plans', () => {
      // $10,000, 12% APR, 12 Months
      const result = calculateAmortizationSchedule(10000, 0.12, 12, '2026-07-14')

      expect(result.monthlyPayment).toBeCloseTo(888.49, 1)
      expect(result.totalInterest).toBeCloseTo(661.85, 1)
      expect(result.schedule.length).toBe(12)
    })
  })

  describe('projectExtraPaymentSavings', () => {
    it('returns zero impact when interest rate is zero', () => {
      const savings = projectExtraPaymentSavings(1200, 0, 12, 100, 50)
      expect(savings.monthsSaved).toBe(0)
      expect(savings.totalInterestSaved).toBe(0)
    })

    it('calculates shortened terms and interest savings with extra monthly payments', () => {
      // Financed: $10,000, APR: 12%, Term: 12 months, Regular Payment: ~$888.49, Extra: $500/mo
      const savings = projectExtraPaymentSavings(10000, 0.12, 12, 888.49, 500)

      expect(savings.revisedTermMonths).toBeLessThan(12)
      expect(savings.monthsSaved).toBeGreaterThan(0)
      expect(savings.totalInterestSaved).toBeGreaterThan(0)
    })
  })
})
