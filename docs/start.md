通过这个项目，你可以知道我们这个项目是要制作一个智能化的需求管理软件来供团队使用。所以现在你需要帮我创建一个这样的网站。这个网站目前的技术站，通过nextjs + typescript + tailwindcss + material UI + supabase 作为技术栈，创建 UI 请参考「参考图」文件夹下的图片进行设计。

项目名为「锡兰」CEYLON，支持黑色，白色，跟随系统主题颜色，样式描述文件在 参考图/UI_SPEC.md 

supabase 数据库的基本密钥为：
project URL: https://vaukvwgvklnpmlwhgyei.supabase.co
Publishable Key: sb_publishable__aG_e9SSZzxXvTARnkDhRA_flkMjOKX
Anon Key : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTU0MDMsImV4cCI6MjA4OTc3MTQwM30.8fmv1ppusEdHEDvEnHGzKgf9g_zsTToyx832BL3yopo

项目采用  .env.development, .env.production .env.example 作为系统管理，前两个要加入 gitignore

后端接口尽量采用 POST 来保证安全性。

你需要先完成基本的官网、登录注册（包括校验等等），用户完成注册的时候，允许用户来上传对应的一些头像。头像的存储，请通过 supabase 来完成一套对象存储服务，然后基于这个对象存储服务来完成图像的上传和存储。账号必须是邮箱，密码至少包含数字和英文和一定的长度。

用户创建项目（允许用户加入项目，创建者默认就是项目的管理员，用户权限分为可读，可写，可管理）

一个项目允许创建多个版本视图，每个版本视图里面就是一个表格，表格具备如下的列：需求编号（每个版本号的需求都从 0 开始算，相同项目不同版本视图下的编号不一样）、需求名、负责人(项目成员的 user_id)、优先级（P0 - P10）、类型（Bug 缺陷报告、Feature 功能需求、Improvement 功能改进、Documentation 文档确实、Security 安全问题、Discussion 讨论和咨询）

并且你还需要创建一个命令行的项目。这个项目可以通过命令行的方法来向我们这个已经写好的网站来推送对应的需求，对它进行基础的增删改查。这个命令行 CLI 需要和 npm 一样，有一个基本的登录功能通过login这个命令参数可以跳转到我们的网站来进行登录。登录权限验证完成之后，就可以通过这个 CLI 来向指定项目的，指定版本视图来进行这个需求视图的增删改查了。

请帮我完成对应的这些功能，并且通过 supabase 的 MCP 创建对应的数据库，并且自动的设计这些数据库里面表格之间的相互关联关系。

下面是 mcp 的配置文件，请自动创建和连接这个 mcp

{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=vaukvwgvklnpmlwhgyei"
    }
  }
}