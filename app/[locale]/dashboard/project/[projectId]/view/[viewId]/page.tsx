'use client'

import { use } from 'react'
import { Box } from '@mui/material'
import MainLayout from '@/components/MainLayout'
import RequirementsTable from '@/components/requirements/RequirementsTable'

export default function ViewPage({ params }: { params: Promise<{ locale: string; projectId: string; viewId: string }> }) {
  const { projectId, viewId } = use(params)

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 } }} data-testid="version-view-page">
        <RequirementsTable versionViewId={viewId} projectId={projectId} />
      </Box>
    </MainLayout>
  )
}
