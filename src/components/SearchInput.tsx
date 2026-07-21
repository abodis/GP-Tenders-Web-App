import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  debounceMs?: number
}

export function SearchInput({ value, onChange, debounceMs = 300 }: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(value)

  // Sync from external prop (e.g. browser back button)
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  // Debounce: call onChange after inactivity
  useEffect(() => {
    if (internalValue === value) return

    const timer = setTimeout(() => {
      onChange(internalValue)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [internalValue, debounceMs, onChange, value])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder="Search tenders..."
        maxLength={200}
        className="pl-9"
      />
    </div>
  )
}
