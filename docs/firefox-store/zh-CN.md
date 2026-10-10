# MarkNest Firefox Add-ons 提交资料

## 基本信息

- 名称：MarkNest - 本地 Markdown 阅读与编辑器
- 版本：3.0.0
- Firefox Add-on ID：`marknest@oreo-8.github.io`
- AMO Slug：`marknest-本地-markdown-阅读与编辑器`
- AMO 版本记录 ID：`6433633`
- 提交状态：已于 2026-08-24 提交，等待 AMO 发布或人工审核
- 公开页面：https://addons.mozilla.org/zh-CN/firefox/addon/marknest-%E6%9C%AC%E5%9C%B0-markdown-%E9%98%85%E8%AF%BB%E4%B8%8E%E7%BC%96%E8%BE%91%E5%99%A8/
- 类型：扩展
- 许可证：MIT License
- 建议分类：Other / Productivity
- 支持平台：Firefox Desktop 153.0 及以上
- 隐私政策：https://gist.github.com/Oreo-8/c9031224d66599e92ef209e787485f18
- 支持网站：https://github.com/Oreo-8/MarkNest
- 支持邮箱：使用 AMO 开发者账号邮箱

## 摘要

在 Firefox 中离线阅读、编辑和保存本地 Markdown 文件，并一键将受支持的 AI 对话收录为 Markdown。

## 详细说明

MarkNest 是一款本地优先的 Markdown 阅读与编辑扩展：

- 直接在 Firefox 中打开、预览和编辑 `.md` / `.markdown` 文件；
- 支持目录浏览与搜索、目录大纲、任务列表、表格、代码高亮、公式和 Mermaid 图表；
- 支持主题、字号、编辑器宽度、图片大图预览和编辑会话恢复；
- 可在用户主动点击后，将 ChatGPT、Gemini、DeepSeek、通义千问、Grok、豆包、Kimi 和智谱清言的当前对话转换为 Markdown；
- Markdown 内容、AI 对话和设置均在浏览器及用户设备本地处理，不会发送给开发者或第三方服务器。

使用本地文件功能前，请在 `about:addons` 的 MarkNest 权限页面开启“访问您计算机上的本地文件”。

## 权限说明

- `storage`：在 Firefox 本地保存界面设置、编辑会话和待打开的收录结果。
- `activeTab`：仅在用户主动点击收录功能后访问当前标签页。
- `scripting`：按用户操作读取当前受支持 AI 页面并转换为 Markdown。
- `downloads`：通过 Firefox 的保存对话框将生成的 Markdown 保存到本机。
- `file:///*`：读取和编辑用户主动打开的本地 Markdown 文件；Firefox 默认关闭该访问，需用户自行授权。
- 所列 AI 网站主机权限：识别受支持网站并响应用户主动发起的收录操作。

## 数据披露

`browser_specific_settings.gecko.data_collection_permissions.required` 声明为 `none`。扩展不将用户数据传输到扩展之外；详情见隐私政策。

## 审核备注

MarkNest 使用 WXT、Vue 和 TypeScript 打包，因此随版本上传了源码 ZIP。请按源码包根目录的 `FIREFOX_BUILD.md` 构建；命令为 `pnpm release:firefox`，生成的安装包位于 `.output/marknest-3.0.0-firefox.zip`。

测试本地 Markdown：

1. 安装扩展并打开 `about:addons`。
2. 打开 MarkNest 的权限页面，允许访问本地文件。
3. 在 Firefox 中打开任意 `.md` 或 `.markdown` 文件。
4. 验证预览、编辑以及 `Ctrl/Command + S` 保存。

测试 AI 对话收录：

1. 打开任一受支持 AI 网站的现有对话。
2. 点击 MarkNest 工具栏图标并选择“收录对话”。
3. 在 Firefox 保存对话框中选择位置。
4. 验证生成的 Markdown 和随后打开的 MarkNest 编辑页。

扩展不要求 MarkNest 服务账号。测试 AI 网站可能要求审核人员使用其自行持有的对应网站账号；本扩展不会接收或存储该账号凭据。
