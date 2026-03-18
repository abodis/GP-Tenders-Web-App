import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">
        The page you're looking for doesn't exist.
      </p>
      <Link
        to="/tenders"
        className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
      >
        Go to Tenders
      </Link>
    </div>
  )
}
