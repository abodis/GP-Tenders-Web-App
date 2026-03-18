import { Button } from "@/components/ui/button"

interface LoadMoreButtonProps {
  onClick: () => void
  isLoading: boolean
}

export function LoadMoreButton({ onClick, isLoading }: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center py-4">
      <Button variant="outline" onClick={onClick} disabled={isLoading}>
        {isLoading ? "Loading…" : "Load more"}
      </Button>
    </div>
  )
}
