import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareSupabaseClient } from '@/lib/supabase-server'

/**
 * 受保护的路由 - 需要登录才能访问
 */
const protectedRoutes = [
  '/dashboard',
  '/projects',
  '/settings',
  '/profile',
]

/**
 * 游客路由 - 未登录用户才能访问
 */
const guestRoutes = [
  '/login',
  '/register',
]

/**
 * 公共路由 - 所有人都能访问
 */
const publicRoutes = [
  '/',
  '/auth/callback',
  '/api',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 创建响应对象
  const response = NextResponse.next()
  
  // 创建 Supabase 客户端
  const supabase = createMiddlewareSupabaseClient(request, response)
  
  // 获取当前会话
  const { data: { session }, error } = await supabase.auth.getSession()
  
  const isAuthenticated = !!session
  
  // 检查是否是受保护路由
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // 检查是否是游客路由
  const isGuestRoute = guestRoutes.some(route => 
    pathname === route
  )
  
  // 检查是否是公共路由
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route)
  )
  
  // 如果访问受保护路由但未登录，重定向到登录页
  // Note: Temporarily disabled for testing
  // if (isProtectedRoute && !isAuthenticated) {
  //   const redirectUrl = new URL('/login', request.url)
  //   redirectUrl.searchParams.set('redirectTo', pathname)
  //   return NextResponse.redirect(redirectUrl)
  // }
  
  // 如果访问游客路由但已登录，重定向到 Dashboard
  // Note: Temporarily disabled for testing
  // if (isGuestRoute && isAuthenticated) {
  //   return NextResponse.redirect(new URL('/dashboard', request.url))
  // }
  
  // 返回带 cookie 的响应
  return response
}

/**
 * 配置中间件匹配的路由
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路由，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     * - 所有图片和字体文件
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|otf)$).*)',
  ],
}
