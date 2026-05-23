import { LimsApp } from '@/components/lims/app'
import { routeFromPath } from '@/components/lims/routes/path'

interface PageProps {
  params: Promise<{ role?: string; segments?: string[] }>
  searchParams: Promise<{ tab?: string }>
}

export default async function LimsRoutePage({ params, searchParams }: PageProps) {
  const { role, segments = [] } = await params
  const { tab } = await searchParams
  return <LimsApp initialRoute={routeFromPath(role, segments, tab)} />
}
