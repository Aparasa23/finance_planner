import { describe, it, expect } from 'vitest'
import { getMerchantSimilarity } from '../src/lib/automation/matching'

describe('Automated Bill Matching Similiarity', () => {
  it('calculates 100% match on exact string tokens', () => {
    const score = getMerchantSimilarity('Comcast Cable Inc', 'Comcast Cable Inc')
    expect(score).toBe(100)
  })

  it('calculates high match scores for partial token overlaps', () => {
    const score = getMerchantSimilarity('Whole Foods Market New York', 'Whole Foods Market')
    // Intersection: ['whole', 'foods', 'market']
    // Union: ['whole', 'foods', 'market', 'new', 'york']
    // Ratio: 3/5 = 60%
    expect(score).toBe(60)
  })

  it('falls back to substring containing check for short inputs or simple strings', () => {
    // "No" gets cleaned to [] (length <= 2). "Nov" has token ['nov'].
    // Since one is empty, substring check triggers: "nov" contains "no" -> 80.
    const score = getMerchantSimilarity('No', 'Nov')
    expect(score).toBe(80)
  })

  it('calculates 0% match score for completely unrelated merchant strings', () => {
    const score = getMerchantSimilarity('American Express Card', 'Whole Foods')
    expect(score).toBe(0)
  })
})
