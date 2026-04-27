import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    onPageChange: vi.fn(),
    hasNextPage: true,
    hasPreviousPage: false,
    from: 1,
    to: 20,
    total: 100 as number | null,
  }

  it('renders nav with aria-label', () => {
    render(<Pagination {...defaultProps} />)
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
  })

  it('shows "Showing X–Y of Z tenders" summary', () => {
    render(<Pagination {...defaultProps} from={1} to={20} total={347} />)
    expect(screen.getByText(/Showing 1–20 of 347 tenders/)).toBeInTheDocument()
  })

  it('hides summary when total is null', () => {
    render(<Pagination {...defaultProps} total={null} />)
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
  })

  it('sets aria-current="page" on the active page button', () => {
    render(<Pagination {...defaultProps} currentPage={3} hasPreviousPage={true} />)
    const activeButton = screen.getByRole('button', { name: 'Page 3' })
    expect(activeButton).toHaveAttribute('aria-current', 'page')
  })

  it('does not set aria-current on non-active page buttons', () => {
    render(<Pagination {...defaultProps} currentPage={1} />)
    const page2 = screen.getByRole('button', { name: 'Page 2' })
    expect(page2).not.toHaveAttribute('aria-current')
  })

  it('disables Previous button on page 1', () => {
    render(<Pagination {...defaultProps} currentPage={1} hasPreviousPage={false} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('disables Next button when hasNextPage is false', () => {
    render(<Pagination {...defaultProps} currentPage={5} hasNextPage={false} />)
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('enables Previous button when hasPreviousPage is true', () => {
    render(<Pagination {...defaultProps} currentPage={3} hasPreviousPage={true} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
  })

  it('calls onPageChange with previous page on Previous click', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination {...defaultProps} currentPage={3} hasPreviousPage={true} onPageChange={onPageChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange with next page on Next click', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination {...defaultProps} currentPage={2} hasPreviousPage={true} onPageChange={onPageChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange when a page number button is clicked', () => {
    const onPageChange = vi.fn()
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('renders all page buttons for small total (≤7 pages)', () => {
    render(<Pagination {...defaultProps} totalPages={5} />)
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByRole('button', { name: `Page ${i}` })).toBeInTheDocument()
    }
  })

  it('renders ellipsis for large page ranges', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={5}
        totalPages={20}
        hasPreviousPage={true}
      />,
    )
    // Should show: 1 ... 4 5 6 ... 20
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 4' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 6' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 20' })).toBeInTheDocument()
    // Pages 2, 3, 7-19 should not be rendered
    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Page 10' })).not.toBeInTheDocument()
  })

  it('enables all non-current page buttons', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={2}
        totalPages={5}
        hasPreviousPage={true}
      />,
    )
    // Non-current pages should be enabled
    expect(screen.getByRole('button', { name: 'Page 3' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Page 4' })).toBeEnabled()
    // Current page should be disabled
    expect(screen.getByRole('button', { name: 'Page 2' })).toBeDisabled()
  })
})
