import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { mkdir, writeFile, unlink, access, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// 临时文件存储目录
const TEMP_DIR = join(process.cwd(), 'tmp', 'uploads')

// 目录总大小阈值（默认 50MB），超过后先清空目录再处理新上传
const TOTAL_SIZE_THRESHOLD_BYTES = 50 * 1024 * 1024

// 确保临时目录存在
async function ensureTempDir() {
  try {
    await access(TEMP_DIR)
  } catch {
    await mkdir(TEMP_DIR, { recursive: true })
  }
}

// 检查并清理临时文件（当目录总大小超过阈值时）
async function cleanupIfNeeded() {
  try {
    await ensureTempDir()
    const files = await readdir(TEMP_DIR)

    let totalSize = 0
    for (const file of files) {
      try {
        const fileStat = await stat(join(TEMP_DIR, file))
        if (fileStat.isFile()) totalSize += fileStat.size
      } catch (err) {
        console.error(`[Cleanup] Failed to stat ${file}:`, err)
      }
    }

    // 如果目录总大小超过阈值，删除所有文件
    if (totalSize >= TOTAL_SIZE_THRESHOLD_BYTES) {
      console.log(
        `[Cleanup] Temp dir total size (${totalSize}) >= threshold (${TOTAL_SIZE_THRESHOLD_BYTES}), cleaning all...`
      )

      let deletedCount = 0
      let errorCount = 0

      for (const file of files) {
        try {
          await unlink(join(TEMP_DIR, file))
          deletedCount++
        } catch (err) {
          errorCount++
          console.error(`[Cleanup] Failed to delete ${file}:`, err)
        }
      }
      
      console.log(`[Cleanup] Deleted ${deletedCount} files, ${errorCount} errors, previous size=${totalSize}`)
      return { cleaned: true, deletedCount, errorCount, totalSize }
    }

    return { cleaned: false, fileCount: files.length, totalSize }
  } catch (error) {
    console.error('[Cleanup] Error checking temp dir:', error)
    return { cleaned: false, error: true }
  }
}

async function parseUploadFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
    const text = await file.text()
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: extension === 'tsv' ? '\t' : ',',
    })
    if (parsed.errors?.length) {
      console.warn('[Import] CSV parse warnings:', parsed.errors)
    }
    const rows = parsed.data ?? []
    const headers = parsed.meta?.fields ?? Object.keys(rows[0] || {})
    return { rows, headers, extension }
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) return { rows: [], headers: [], extension }
    const firstSheet = workbook.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })
    const headers = Object.keys(rows[0] || {})
    return { rows, headers, extension }
  }

  throw new Error('Unsupported file format')
}

/**
 * POST /api/projects/[projectId]/views/[viewId]/import
 * 
 * 导入 CSV/Excel 数据到版本视图
 * 1. 验证用户权限
 * 2. 保存临时文件
 * 3. 解析数据
 * 4. 插入到 requirements 表
 * 5. 关联到版本视图
 * 6. 清理临时文件
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; viewId: string }> }
) {
  const { projectId, viewId } = await params
  
  // 0. 检查并清理临时文件（按需清理策略）
  const cleanupResult = await cleanupIfNeeded()
  if (cleanupResult.cleaned) {
    console.log(`[Import] Cleaned up ${cleanupResult.deletedCount} temp files before import`)
  }
  
  let tempFilePath = join(TEMP_DIR, `${randomUUID()}.json`)

  try {
    // 1. 验证用户身份
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 检查项目成员权限
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. 获取上传的数据
    const formData = await request.formData()
    const uploadFile = formData.get('file') as File | null
    const dataBlob = formData.get('data') as Blob | null
    const headersJson = formData.get('headers') as string | null
    const fileNameFromClient = (formData.get('fileName') as string | null) || ''

    let rows: Record<string, unknown>[] = []
    let headers: string[] = []
    let fileName = fileNameFromClient || 'import'

    if (uploadFile && uploadFile.size > 0) {
      fileName = uploadFile.name || fileName
      const ext = uploadFile.name.split('.').pop()?.toLowerCase() || 'bin'
      tempFilePath = join(TEMP_DIR, `${randomUUID()}.${ext}`)
      await ensureTempDir()
      const rawBuffer = Buffer.from(await uploadFile.arrayBuffer())
      await writeFile(tempFilePath, rawBuffer)
      const parsed = await parseUploadFile(uploadFile)
      rows = parsed.rows
      headers = parsed.headers
    } else if (dataBlob) {
      // 兼容旧前端：仍支持传预解析 JSON
      const dataText = await dataBlob.text()
      rows = JSON.parse(dataText)
      headers = headersJson ? JSON.parse(headersJson) : Object.keys(rows[0] || {})
      await ensureTempDir()
      await writeFile(
        tempFilePath,
        JSON.stringify({ rows, headers, fileName, importedAt: new Date().toISOString() }, null, 2)
      )
    } else {
      return NextResponse.json({ error: 'No import file or data provided' }, { status: 400 })
    }

    // 5. 验证版本视图
    const { data: view } = await supabase
      .from('version_views')
      .select('id, project_id')
      .eq('id', viewId)
      .eq('project_id', projectId)
      .single()

    if (!view) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 })
    }

    // 6. 获取视图的列配置
    const { data: viewColumns } = await supabase
      .from('version_view_columns')
      .select('id, name, type, order_num')
      .eq('view_id', viewId)
      .order('order_num', { ascending: true })

    // 7. 映射 CSV 列到需求字段
    const mappedData = rows.map((row: any, index: number) => {
      const requirement: any = {
        project_id: projectId,
        created_by: user.id,
        order_num: index,
      }

      // 标准字段映射
      if (row['标题'] || row['title'] || row['Title']) {
        requirement.title = row['标题'] || row['title'] || row['Title']
      }
      if (row['描述'] || row['description'] || row['Description']) {
        requirement.description = row['描述'] || row['description'] || row['Description']
      }
      if (row['优先级'] || row['priority'] || row['Priority']) {
        requirement.priority = mapPriority(row['优先级'] || row['priority'] || row['Priority'])
      }
      if (row['状态'] || row['status'] || row['Status']) {
        requirement.status = mapStatus(row['状态'] || row['status'] || row['Status'])
      }

      // 自定义字段存储在 data_json 中
      const customFields: any = {}
      viewColumns?.forEach((col: any) => {
        const value = row[col.name] || row[col.name.toLowerCase()] || row[col.name.toUpperCase()]
        if (value !== undefined) {
          customFields[col.id] = value
        }
      })

      if (Object.keys(customFields).length > 0) {
        requirement.data_json = customFields
      }

      return requirement
    })

    // 8. 记录解析元数据（与上传文件同名 .meta.json）
    await writeFile(
      `${tempFilePath}.meta.json`,
      JSON.stringify(
        {
          projectId,
          viewId,
          userId: user.id,
          fileName,
          importedAt: new Date().toISOString(),
          rowCount: mappedData.length,
          headers,
        },
        null,
        2
      )
    )

    // 9. 批量插入需求
    const { data: insertedRequirements, error: insertError } = await supabase
      .from('requirements')
      .insert(mappedData)
      .select('id')

    if (insertError) {
      // 清理临时文件
      await unlink(tempFilePath).catch(() => {})
      await unlink(`${tempFilePath}.meta.json`).catch(() => {})
      throw insertError
    }

    // 10. 关联到版本视图
    const viewRequirements = insertedRequirements.map((req: any, index: number) => ({
      view_id: viewId,
      requirement_id: req.id,
      order_num: index,
    }))

    const { error: linkError } = await supabase
      .from('version_view_requirements')
      .insert(viewRequirements)

    if (linkError) {
      // 回滚：删除已插入的需求
      await supabase
        .from('requirements')
        .delete()
        .in('id', insertedRequirements.map((r: any) => r.id))
      
      // 清理临时文件
      await unlink(tempFilePath).catch(() => {})
      await unlink(`${tempFilePath}.meta.json`).catch(() => {})
      throw linkError
    }

    // 11. 记录导入历史
    await supabase.from('import_history').insert({
      project_id: projectId,
      view_id: viewId,
      user_id: user.id,
      file_name: fileName,
      row_count: mappedData.length,
      temp_file_path: tempFilePath,
      status: 'success',
    })

    // 12. 延迟清理临时文件（24小时后）
    // 实际清理由定时任务处理

    return NextResponse.json({
      success: true,
      imported: mappedData.length,
      fileName,
    })

  } catch (error) {
    console.error('Import error:', error)
    
    // 清理临时文件
    try {
      await unlink(tempFilePath)
    } catch {}
    try {
      await unlink(`${tempFilePath}.meta.json`)
    } catch {}

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    )
  }
}

// 优先级映射
function mapPriority(value: string): string {
  const lower = value.toLowerCase()
  if (['p0', 'critical', 'urgent', '紧急', '最高'].includes(lower)) return 'critical'
  if (['p1', 'high', '高'].includes(lower)) return 'high'
  if (['p2', 'medium', '中'].includes(lower)) return 'medium'
  if (['p3', 'low', '低'].includes(lower)) return 'low'
  return 'medium'
}

// 状态映射
function mapStatus(value: string): string {
  const lower = value.toLowerCase()
  if (['todo', 'pending', '待办', '待处理'].includes(lower)) return 'todo'
  if (['in_progress', '进行中', '开发中'].includes(lower)) return 'in_progress'
  if (['done', 'completed', '完成', '已完成'].includes(lower)) return 'done'
  if (['cancelled', '取消', '已取消'].includes(lower)) return 'cancelled'
  return 'todo'
}
