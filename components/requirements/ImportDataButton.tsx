'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material'
import {
  Add,
  FileUpload,
  KeyboardArrowDown,
} from '@mui/icons-material'
import ImportDataDialog from './ImportDataDialog'
import { CEYLON_ORANGE, useThemeStore } from '@/stores/themeStore'

interface ImportDataButtonProps {
  projectId: string
  viewId: string
  onImportSuccess?: () => void
  onInsertRow?: () => void
}

export default function ImportDataButton({
  projectId,
  viewId,
  onImportSuccess,
  onInsertRow,
}: ImportDataButtonProps) {
  const t = useTranslations()
  const { getEffectiveMode } = useThemeStore()
  const isDark = getEffectiveMode() === 'dark'
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleImportClick = () => {
    handleClose()
    setImportDialogOpen(true)
  }

  return (
    <>
      <Button
        variant="contained"
        size="small"
        onClick={handleClick}
        endIcon={<KeyboardArrowDown />}
        startIcon={<Add />}
        sx={{
          backgroundColor: CEYLON_ORANGE,
          '&:hover': { backgroundColor: '#A34712' },
          textTransform: 'none',
          fontWeight: 500,
        }}
      >
        {t('requirements.import.insert')}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 220,
            backgroundColor: isDark ? '#1c1917' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            handleClose()
            onInsertRow?.()
          }}
        >
          <ListItemIcon>
            <Add fontSize="small" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }} />
          </ListItemIcon>
          <ListItemText 
            primary={t('requirements.import.insertRow')}
            secondary={t('requirements.import.insertRowDesc')}
          />
        </MenuItem>

        <Tooltip title={t('requirements.import.importTooltip')} placement="right">
          <MenuItem onClick={handleImportClick}>
            <ListItemIcon>
              <FileUpload fontSize="small" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }} />
            </ListItemIcon>
            <ListItemText 
              primary={t('requirements.import.importCSV')}
              secondary={t('requirements.import.importCSVDesc')}
            />
          </MenuItem>
        </Tooltip>
      </Menu>

      <ImportDataDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        projectId={projectId}
        viewId={viewId}
        onSuccess={onImportSuccess}
      />
    </>
  )
}
