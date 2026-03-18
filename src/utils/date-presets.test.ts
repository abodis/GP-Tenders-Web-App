import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  today,
  daysAgo,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfLastMonth,
  endOfLastMonth,
  DATE_PRESETS,
} from './date-presets'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Helper: mock Date to a fixed point in time. */
function mockDate(isoDate: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(`${isoDate}T12:00:00`))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('date-presets', () => {
  describe('today()', () => {
    it('returns current date as YYYY-MM-DD', () => {
      mockDate('2025-07-16')
      expect(today()).toBe('2025-07-16')
    })

    it('matches ISO date format', () => {
      expect(today()).toMatch(ISO_DATE_RE)
    })
  })

  describe('daysAgo(n)', () => {
    it('returns date n days before today', () => {
      mockDate('2025-07-16')
      expect(daysAgo(7)).toBe('2025-07-09')
      expect(daysAgo(30)).toBe('2025-06-16')
    })

    it('crosses month boundary correctly', () => {
      mockDate('2025-03-02')
      expect(daysAgo(2)).toBe('2025-02-28')
    })

    it('daysAgo(0) equals today', () => {
      mockDate('2025-07-16')
      expect(daysAgo(0)).toBe(today())
    })
  })

  describe('startOfWeek() — Monday', () => {
    it('returns Monday when today is Wednesday', () => {
      mockDate('2025-07-16') // Wednesday
      expect(startOfWeek()).toBe('2025-07-14') // Monday
    })

    it('returns Monday when today is Monday', () => {
      mockDate('2025-07-14') // Monday
      expect(startOfWeek()).toBe('2025-07-14')
    })

    it('returns Monday when today is Sunday', () => {
      mockDate('2025-07-20') // Sunday
      expect(startOfWeek()).toBe('2025-07-14')
    })

    it('returns Monday when today is Saturday', () => {
      mockDate('2025-07-19') // Saturday
      expect(startOfWeek()).toBe('2025-07-14')
    })
  })

  describe('endOfWeek() — Sunday', () => {
    it('returns Sunday when today is Wednesday', () => {
      mockDate('2025-07-16') // Wednesday
      expect(endOfWeek()).toBe('2025-07-20') // Sunday
    })

    it('returns Sunday when today is Sunday', () => {
      mockDate('2025-07-20') // Sunday
      expect(endOfWeek()).toBe('2025-07-20')
    })

    it('returns Sunday when today is Monday', () => {
      mockDate('2025-07-14') // Monday
      expect(endOfWeek()).toBe('2025-07-20')
    })
  })

  describe('startOfMonth()', () => {
    it('returns first day of current month', () => {
      mockDate('2025-07-16')
      expect(startOfMonth()).toBe('2025-07-01')
    })

    it('returns itself when today is the 1st', () => {
      mockDate('2025-07-01')
      expect(startOfMonth()).toBe('2025-07-01')
    })
  })

  describe('endOfMonth()', () => {
    it('returns last day of current month', () => {
      mockDate('2025-07-16')
      expect(endOfMonth()).toBe('2025-07-31')
    })

    it('handles February in a non-leap year', () => {
      mockDate('2025-02-10')
      expect(endOfMonth()).toBe('2025-02-28')
    })

    it('handles February in a leap year', () => {
      mockDate('2024-02-10')
      expect(endOfMonth()).toBe('2024-02-29')
    })

    it('handles 30-day months', () => {
      mockDate('2025-06-15')
      expect(endOfMonth()).toBe('2025-06-30')
    })
  })

  describe('startOfLastMonth()', () => {
    it('returns first day of previous month', () => {
      mockDate('2025-07-16')
      expect(startOfLastMonth()).toBe('2025-06-01')
    })

    it('crosses year boundary', () => {
      mockDate('2025-01-15')
      expect(startOfLastMonth()).toBe('2024-12-01')
    })
  })

  describe('endOfLastMonth()', () => {
    it('returns last day of previous month', () => {
      mockDate('2025-07-16')
      expect(endOfLastMonth()).toBe('2025-06-30')
    })

    it('crosses year boundary', () => {
      mockDate('2025-01-15')
      expect(endOfLastMonth()).toBe('2024-12-31')
    })

    it('handles March → February in leap year', () => {
      mockDate('2024-03-10')
      expect(endOfLastMonth()).toBe('2024-02-29')
    })
  })

  describe('DATE_PRESETS', () => {
    it('has 6 presets', () => {
      expect(DATE_PRESETS).toHaveLength(6)
    })

    it('each preset has a label and getRange returning {from, to} ISO dates', () => {
      mockDate('2025-07-16')
      for (const preset of DATE_PRESETS) {
        expect(typeof preset.label).toBe('string')
        const range = preset.getRange()
        expect(range.from).toMatch(ISO_DATE_RE)
        expect(range.to).toMatch(ISO_DATE_RE)
        expect(range.from <= range.to).toBe(true)
      }
    })

    it('preset labels match expected values', () => {
      const labels = DATE_PRESETS.map((p) => p.label)
      expect(labels).toEqual([
        'Today',
        'Last 7 days',
        'Last 30 days',
        'This week',
        'This month',
        'Last month',
      ])
    })
  })
})
