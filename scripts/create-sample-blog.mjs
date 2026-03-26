#!/usr/bin/env node

/**
 * 创建示例博客文章脚本
 * 用于初始化平台介绍文章
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vaukvwgvklnpmlwhgyei.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5NTQwMywiZXhwIjoyMDg5NzcxNDAzfQ.oeZHkt9gkvNg9ygvRa79IxNQ0va5TVdcVZhM3AvE_a8'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const sampleBlog = {
  slug: 'introducing-ceylon-ai-requirements-platform',
  title: 'Introducing Ceylon: The AI-Powered Requirements Platform',
  subtitle: 'Transforming how teams manage requirements from feedback to implementation',
  content: `# Welcome to Ceylon

We are excited to introduce **Ceylon**, a modern, AI-driven requirements management platform designed to revolutionize how product teams capture, analyze, and implement user feedback.

## The Problem We Solve

Traditional requirements management often involves:
- Scattered feedback across multiple channels
- Manual documentation that quickly becomes outdated
- Miscommunication between stakeholders and developers
- Lost context during handoffs

## How Ceylon Helps

### 1. Intelligent Feedback Processing

Ceylon automatically analyzes user feedback using AI to extract key requirements and insights. No more manual sorting through hundreds of support tickets or user messages.

\`\`\`javascript
// Example: Automatic requirement extraction
const feedback = "I wish the dashboard had dark mode and export to PDF";
// Ceylon AI extracts:
// - Feature: Dark mode support
// - Feature: PDF export functionality
\`\`\`

### 2. Smart Iteration Loop

Our platform creates an intelligent closed loop between feedback collection and product iteration:



> "The best product teams don't just collect feedback—they act on it systematically." — Ceylon Team

### 3. Local AI Integration

With our CLI tool, your AI assistant can directly interact with your requirements:

\`\`\`bash
# Install Ceylon CLI
npm install -g @ceylon/cli

# Sync requirements with your AI workflow
ceylon sync --project my-app
\`\`\`

## Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| AI Feedback Analysis | Automatically categorize and prioritize feedback | ✅ Available |
| Version Views | Track requirements across product versions | ✅ Available |
| CLI Tool | Local AI integration for developers | ✅ Available |
| Multi-language | Support for 中文, English, 日本語 | ✅ Available |
| Real-time Collaboration | Team-wide requirement management | 🚧 Coming Soon |

## Technical Architecture

Ceylon is built with modern web technologies:

- **Frontend**: Next.js 16 + React 19 + Material UI
- **Backend**: Supabase (PostgreSQL + Auth)
- **AI Integration**: OpenAI-compatible APIs
- **CLI**: Node.js with TypeScript

$$\\text{Efficiency} = \\frac{\\text{Requirements Processed}}{\\text{Time Spent}} \\times \\text{AI Factor}$$

## Get Started Today

Ready to transform your requirements workflow?

1. [Sign up for free](http://localhost:3000/register)
2. Create your first project
3. Start collecting and analyzing feedback

---

*Join us on this journey to build better products, faster.*

**The Ceylon Team**`,
  excerpt: 'Discover how Ceylon uses AI to transform user feedback into actionable requirements, creating an intelligent workflow from feedback collection to product iteration.',
  cover_image: null,
  category: 'journey',
  status: 'published',
  published_at: new Date().toISOString(),
  meta_title: 'Introducing Ceylon: AI-Powered Requirements Management Platform',
  meta_description: 'Ceylon is a modern AI-driven requirements management platform that helps teams capture, analyze, and implement user feedback efficiently.',
  view_count: 0
}

async function createSampleBlog() {
  console.log('📝 Creating sample blog post...\n')
  
  // Check if already exists
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('slug', sampleBlog.slug)
    .maybeSingle()
  
  if (existing) {
    console.log('⚠️  Sample blog already exists, updating...')
    const { data, error } = await supabase
      .from('blog_posts')
      .update(sampleBlog)
      .eq('slug', sampleBlog.slug)
      .select()
    
    if (error) {
      console.error('❌ Update failed:', error.message)
      process.exit(1)
    }
    console.log('✅ Sample blog updated successfully!')
  } else {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert(sampleBlog)
      .select()
    
    if (error) {
      console.error('❌ Insert failed:', error.message)
      process.exit(1)
    }
    console.log('✅ Sample blog created successfully!')
  }
  
  console.log('\n📋 Blog Details:')
  console.log('   Title:', sampleBlog.title)
  console.log('   Slug:', sampleBlog.slug)
  console.log('   Status:', sampleBlog.status)
  console.log('   URL: http://localhost:3000/blog/' + sampleBlog.slug)
  console.log('\n🚀 You can now view this blog at:')
  console.log('   http://localhost:3000/blog')
}

createSampleBlog().catch(console.error)
