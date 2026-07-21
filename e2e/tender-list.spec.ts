import { test, expect } from '@playwright/test'

test.describe('Tender List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tenders')
  })

  test.describe('Search', () => {
    test('typing a query updates the URL with q param', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search tenders...')
      await searchInput.fill('biodiversity')
      await page.waitForTimeout(400) // debounce

      await page.waitForURL(/[?&]q=biodiversity/)
      const url = new URL(page.url())
      expect(url.searchParams.get('q')).toBe('biodiversity')
    })

    test('clearing search input removes q param from URL', async ({ page }) => {
      // First, search for something
      const searchInput = page.getByPlaceholder('Search tenders...')
      await searchInput.fill('water')
      await page.waitForTimeout(400)
      await page.waitForURL(/[?&]q=water/)

      // Clear the input
      await searchInput.clear()
      await page.waitForTimeout(400)

      await page.waitForURL((url) => !url.searchParams.has('q'))
      const url = new URL(page.url())
      expect(url.searchParams.has('q')).toBe(false)
    })
  })

  test.describe('Sort disabled during search', () => {
    test('sort headers have opacity-50 and are non-interactive when search is active', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search tenders...')
      await searchInput.fill('test query')
      await page.waitForTimeout(400)
      await page.waitForURL(/[?&]q=test/)

      // All sort headers should have opacity-50 class
      const sortHeaders = page.locator('[aria-sort]')
      const count = await sortHeaders.count()
      expect(count).toBeGreaterThan(0)

      for (let i = 0; i < count; i++) {
        const header = sortHeaders.nth(i)
        await expect(header).toHaveClass(/opacity-50/)
      }

      // Clicking a sort header should not change URL sort params
      const urlBefore = page.url()
      await sortHeaders.first().click()
      await page.waitForTimeout(200)
      // URL should not have gained sort_by param
      const urlAfter = page.url()
      expect(new URL(urlAfter).searchParams.has('sort_by')).toBe(
        new URL(urlBefore).searchParams.has('sort_by'),
      )
    })
  })

  test.describe('Min interestingness filter', () => {
    test('selecting a threshold updates the URL with min_interestingness param', async ({ page }) => {
      // Open the Min Interestingness select and pick "5+"
      const trigger = page.locator('text=Min Interestingness').locator('..').locator('button')
      await trigger.click()
      await page.getByRole('option', { name: '5+' }).click()

      await page.waitForURL(/[?&]min_interestingness=5/)
      const url = new URL(page.url())
      expect(url.searchParams.get('min_interestingness')).toBe('5')
    })
  })

  test.describe('Score columns', () => {
    test('table has Interest. and Unified column headers', async ({ page }) => {
      const interestHeader = page.getByRole('columnheader', { name: /Interest/i })
      const unifiedHeader = page.getByRole('columnheader', { name: /Unified/i })

      await expect(interestHeader).toBeVisible()
      await expect(unifiedHeader).toBeVisible()
    })
  })

  test.describe('Empty state', () => {
    test('searching for nonsense shows empty state with clear button', async ({ page }) => {
      const searchInput = page.getByPlaceholder('Search tenders...')
      await searchInput.fill('xyznonexistent123')
      await page.waitForTimeout(400)
      await page.waitForURL(/[?&]q=xyznonexistent123/)

      // Wait for the API response and empty state to render
      await expect(page.getByText('No tenders match your search')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByRole('button', { name: /Clear search/i })).toBeVisible()
    })
  })
})
