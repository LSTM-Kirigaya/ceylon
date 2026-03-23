import { createRequire } from 'module'
import { createClient } from '@supabase/supabase-js'

const require = createRequire(import.meta.url)
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('缺少数据库环境变量：NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)
const coreTables = ['profiles', 'projects', 'project_members', 'version_views', 'requirements']

async function checkDatabase() {
  console.log('=== 使用 .env 环境变量连接数据库 ===\n')

  for (const tableName of coreTables) {
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error(`❌ 无法访问 ${tableName}:`, countError.message)
      continue
    }

    const { data: sample, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (sampleError) {
      console.error(`❌ 无法读取 ${tableName} 示例数据:`, sampleError.message)
      continue
    }

    console.log(`✅ ${tableName}: ${count ?? 0} 条记录`)
    if (sample && sample.length > 0) {
      console.log(`   示例字段: ${Object.keys(sample[0]).join(', ')}`)
    } else {
      console.log('   示例字段: (当前无数据)')
    }
  }

  console.log('\n=== 数据库连通性检查完成 ===')
}

checkDatabase().catch((error) => {
  console.error('数据库检查失败:', error)
  process.exit(1)
})
