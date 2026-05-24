"use client"

import { ReferenceLimsApp } from "@/components/lims/reference-ui"
import type { Route } from "@/components/lims/shell"

interface LimsAppProps {
  initialRoute?: Route
}

export function LimsApp({ initialRoute }: LimsAppProps = {}) {
  return <ReferenceLimsApp initialRoute={initialRoute} />
}

export default LimsApp
