import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vaukvwgvklnpmlwhgyei.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5NTQwMywiZXhwIjoyMDg5NzcxNDAzfQ.oeZHkt9gkvNg9ygvRa79IxNQ0va5TVdcVZhM3AvE_a8'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkDatabase() {
  console.log('=== 正在查询数据库结构 ===\n')
  
  // 1. 查询所有表
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
  
  if (tablesError) {
    console.error('查询表失败:', tablesError)
    return
  }
  
  console.log('📋 数据库中的表:')
  console.log('─'.repeat(50))
  
  for (const table of tables || []) {
    const tableName = table.table_name
    console.log(`\n📦 ${tableName}`)
    
    // 查询表结构
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position')
    
    if (columnsError) {
      console.error(`  查询 ${tableName} 结构失败:`, columnsError)
      continue
    }
    
    console.log('  字段:')
    for (const col of columns || []) {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
      console.log(`    • ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`)
    }
    
    // 查询 RLS 策略
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname')
      .eq('tablename', tableName)
    
    if (!policiesError && policies && policies.length > 0) {
      console.log(`  🔐 RLS 策略 (${policies.length}):`)
      for (const policy of policies) {
        console.log(`    • ${policy.policyname}`)
      }
    }
  }
  
  // 2. 查询 Storage Buckets
  console.log('\n\n📁 Storage Buckets:')
  console.log('─'.repeat(50))
  const { data: buckets, error: bucketsError } = await supabase
    .from('storage.buckets')
    .select('id, name, public')
  
  if (!bucketsError && buckets) {
    for (const bucket of buckets) {
      console.log(`  • ${bucket.name} (public: ${bucket.public})`)
    }
  }
  
  // 3. 查询每个表的数据量
  console.log('\n\n📊 表数据量统计:')
  console.log('─'.repeat(50))
  
  const tableNames = tables?.map(t => t.table_name) || []
  for (const tableName of tableNames) {
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
    
    if (!countError) {
      console.log(`  • ${tableName}: ${count || 0} 条记录`)
    }
  }
  
  console.log('\n=== 查询完成 ===')
}

checkDatabase()
