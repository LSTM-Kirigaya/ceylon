'use client'

import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import { Box } from '@mui/material'
import { useThemeStore } from '@/stores/themeStore'
import 'katex/dist/katex.min.css'

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Mermaid chart renderer
function MermaidChart({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { getEffectiveMode } = useThemeStore()
  const isDark = getEffectiveMode() === 'dark'

  useEffect(() => {
    if (ref.current && typeof window !== 'undefined') {
      import('mermaid').then((mermaid) => {
        mermaid.default.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'strict',
        })
        mermaid.default.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, chart).then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg
          }
        })
      })
    }
  }, [chart, isDark])

  return <div ref={ref} />
}

// Custom code block component
function CodeBlock({ children, className, ...props }: React.HTMLProps<HTMLElement>) {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''

  // Handle mermaid diagrams
  if (language === 'mermaid' && typeof children === 'string' && children) {
    return <MermaidChart chart={children} />
  }

  return (
    <pre className={className}>
      <code className={className} {...props}>
        {children}
      </code>
    </pre>
  )
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const { getEffectiveMode } = useThemeStore()
  const isDark = getEffectiveMode() === 'dark'

  return (
    <Box
      className={`markdown-content ${className || ''}`}
      sx={{
        '& h1': {
          fontSize: '2rem',
          fontWeight: 700,
          mt: 4,
          mb: 2,
          color: isDark ? 'white' : '#1a1a1a',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          pb: 1,
        },
        '& h2': {
          fontSize: '1.5rem',
          fontWeight: 600,
          mt: 3,
          mb: 1.5,
          color: isDark ? 'white' : '#1a1a1a',
        },
        '& h3': {
          fontSize: '1.25rem',
          fontWeight: 600,
          mt: 2.5,
          mb: 1,
          color: isDark ? 'white' : '#1a1a1a',
        },
        '& h4, & h5, & h6': {
          fontWeight: 600,
          mt: 2,
          mb: 1,
          color: isDark ? 'white' : '#1a1a1a',
        },
        '& p': {
          fontSize: '1rem',
          lineHeight: 1.8,
          mb: 2,
          color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)',
        },
        '& a': {
          color: '#ea580c',
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'underline',
          },
        },
        '& ul, & ol': {
          pl: 3,
          mb: 2,
          color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)',
        },
        '& li': {
          mb: 0.5,
          lineHeight: 1.8,
        },
        '& blockquote': {
          borderLeft: '4px solid #ea580c',
          pl: 2,
          py: 0.5,
          my: 2,
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderRadius: '0 4px 4px 0',
          '& p': {
            m: 0,
            color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
          },
        },
        '& pre': {
          backgroundColor: isDark ? '#1a1a2e' : '#f5f5f5',
          p: 2,
          borderRadius: 2,
          overflow: 'auto',
          mb: 2,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        },
        '& code': {
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace',
          fontSize: '0.9em',
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          p: '2px 6px',
          borderRadius: 1,
        },
        '& pre code': {
          backgroundColor: 'transparent',
          p: 0,
        },
        '& table': {
          width: '100%',
          borderCollapse: 'collapse',
          mb: 2,
        },
        '& th, & td': {
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
          p: 1,
          textAlign: 'left',
        },
        '& th': {
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          fontWeight: 600,
        },
        '& img': {
          maxWidth: '100%',
          height: 'auto',
          borderRadius: 2,
          my: 2,
        },
        '& hr': {
          border: 'none',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          my: 3,
        },
        '& .katex': {
          fontSize: '1.1em',
        },
        '& .mermaid': {
          display: 'flex',
          justifyContent: 'center',
          my: 2,
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          pre: CodeBlock,
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  )
}
