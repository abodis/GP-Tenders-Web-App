import { useEffect, useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTenderFeedback } from '@/hooks/useTenderFeedback'

interface FeedbackButtonsProps {
  sourceId: string
  tenderId: string
  feedbackType: 'interesting' | 'boring' | null
}

export function FeedbackButtons({ sourceId, tenderId, feedbackType }: FeedbackButtonsProps) {
  const { submitMutation, deleteMutation } = useTenderFeedback(sourceId, tenderId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(null), 5000)
    return () => clearTimeout(timer)
  }, [error])

  function handleClick(type: 'interesting' | 'boring') {
    if (feedbackType === type) {
      deleteMutation.mutate(undefined, {
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to remove feedback'),
      })
    } else {
      submitMutation.mutate(type, {
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to save feedback'),
      })
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={feedbackType === 'interesting' ? 'default' : 'ghost'}
        size="icon-sm"
        onClick={() => handleClick('interesting')}
        aria-label="Mark as interesting"
        aria-pressed={feedbackType === 'interesting'}
      >
        <ThumbsUp
          className={cn(
            'size-4',
            feedbackType === 'interesting' && 'fill-current'
          )}
        />
      </Button>
      <Button
        variant={feedbackType === 'boring' ? 'destructive' : 'ghost'}
        size="icon-sm"
        onClick={() => handleClick('boring')}
        aria-label="Mark as boring"
        aria-pressed={feedbackType === 'boring'}
      >
        <ThumbsDown
          className={cn(
            'size-4',
            feedbackType === 'boring' && 'fill-current'
          )}
        />
      </Button>
      {error && (
        <span className="ml-2 text-xs text-destructive">{error}</span>
      )}
    </div>
  )
}
