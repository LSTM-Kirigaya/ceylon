'use client'

import { use } from 'react'
import { Box } from '@mui/material'
import MainLayout from '@/components/MainLayout'
import { ReviewDiffViewer } from '@/components/review/ReviewDiffViewer'

export default function ReviewDetailPage({ 
  params 
}: { 
  params: Promise<{ 
    projectId: string
    viewId: string
    reviewId: string 
  }> 
}) {
  const { projectId, viewId, reviewId } = use(params)

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 } }} data-testid="review-detail-page">
        <ReviewDiffViewer 
          reviewSessionId={reviewId}
          projectId={projectId}
          viewId={viewId}
        />
      </Box>
    </MainLayout>
  )
}
