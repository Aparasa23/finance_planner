export interface AmortizationPeriod {
  periodNumber: number
  dueDate: string
  paymentAmount: number
  principalPaid: number
  interestPaid: number
  remainingPrincipal: number
}

/**
 * Calculates a complete amortization schedule for an installment loan.
 */
export function calculateAmortizationSchedule(
  financedPrincipal: number,
  annualInterestRate: number, // e.g. 0.12 for 12% APR, or 0 for interest-free
  termMonths: number,
  startDateStr: string
): {
  monthlyPayment: number
  totalInterest: number
  totalPayments: number
  schedule: AmortizationPeriod[]
} {
  const schedule: AmortizationPeriod[] = []
  const r = annualInterestRate / 12 // monthly interest rate
  const n = termMonths
  
  // Calculate fixed monthly payment (PMT formula)
  let monthlyPayment = 0
  if (r === 0) {
    monthlyPayment = financedPrincipal / n
  } else {
    monthlyPayment = financedPrincipal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  }

  let remainingPrincipal = financedPrincipal
  let totalInterest = 0
  const startDate = new Date(startDateStr)

  for (let i = 1; i <= n; i++) {
    const interestComponent = remainingPrincipal * r
    const principalComponent = monthlyPayment - interestComponent
    remainingPrincipal = Math.max(0, remainingPrincipal - principalComponent)
    
    totalInterest += interestComponent

    const paymentDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate())

    schedule.push({
      periodNumber: i,
      dueDate: paymentDate.toISOString().split('T')[0],
      paymentAmount: Number(monthlyPayment.toFixed(2)),
      principalPaid: Number(principalComponent.toFixed(2)),
      interestPaid: Number(interestComponent.toFixed(2)),
      remainingPrincipal: Number(remainingPrincipal.toFixed(2)),
    })
  }

  return {
    monthlyPayment: Number(monthlyPayment.toFixed(2)),
    totalInterest: Number(totalInterest.toFixed(2)),
    totalPayments: Number((monthlyPayment * n).toFixed(2)),
    schedule,
  }
}

/**
 * Simulates the effect of extra monthly principal payments.
 * Returns interest saved and months saved.
 */
export function projectExtraPaymentSavings(
  financedPrincipal: number,
  annualInterestRate: number,
  termMonths: number,
  regularPayment: number,
  extraPaymentAmount: number
): {
  revisedTermMonths: number
  monthsSaved: number
  totalInterestSaved: number
  newTotalInterest: number
} {
  if (annualInterestRate <= 0 || extraPaymentAmount <= 0) {
    return {
      revisedTermMonths: termMonths,
      monthsSaved: 0,
      totalInterestSaved: 0,
      newTotalInterest: 0,
    }
  }

  const r = annualInterestRate / 12
  let remainingPrincipal = financedPrincipal
  let month = 0
  let newTotalInterest = 0

  // Simulate month-by-month until principal is fully paid
  while (remainingPrincipal > 0 && month < 600) { // Safety ceiling of 50 years
    month++
    const interest = remainingPrincipal * r
    newTotalInterest += interest

    const totalContribution = regularPayment + extraPaymentAmount
    // Principal paid cannot exceed remaining balance + interest
    const principalPaid = Math.min(remainingPrincipal, totalContribution - interest)
    remainingPrincipal = Math.max(0, remainingPrincipal - principalPaid)
  }

  // Calculate baseline interest
  const baselineSchedule = calculateAmortizationSchedule(financedPrincipal, annualInterestRate, termMonths, new Date().toISOString())
  const interestSaved = Math.max(0, baselineSchedule.totalInterest - newTotalInterest)
  const monthsSaved = Math.max(0, termMonths - month)

  return {
    revisedTermMonths: month,
    monthsSaved,
    totalInterestSaved: Number(interestSaved.toFixed(2)),
    newTotalInterest: Number(newTotalInterest.toFixed(2)),
  }
}
