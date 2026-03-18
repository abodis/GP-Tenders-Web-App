import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/layouts/AppLayout'
import NotFoundPage from '@/pages/NotFoundPage'
import RunsListPage from '@/pages/RunsListPage'
import RunDetailPage from '@/pages/RunDetailPage'
import TenderListPage from '@/pages/TenderListPage'
import TenderDetailPage from '@/pages/TenderDetailPage'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/tenders" replace />} />
              <Route path="tenders" element={<TenderListPage />} />
              <Route path="tenders/:sourceId/:tenderId" element={<TenderDetailPage />} />
              <Route path="runs" element={<RunsListPage />} />
              <Route path="runs/:sourceId/:runDate" element={<RunDetailPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
