interface VisibilityBadgeProps {
  fullyVisible: boolean
}

export function VisibilityBadge({ fullyVisible }: VisibilityBadgeProps) {
  if (fullyVisible) {
    return (
      <span
        title="Freely available"
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700"
        aria-label="Freely available"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3" aria-hidden="true">
          <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
        </svg>
      </span>
    )
  }

  return (
    <span
      title="Paid source"
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-900 text-white"
      aria-label="Paid source"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3" aria-hidden="true">
        <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v4A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
      </svg>
    </span>
  )
}
