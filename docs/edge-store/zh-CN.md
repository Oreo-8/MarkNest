# Microsoft Edge 加载项发布资料（简体中文）

## 基本信息

- 扩展名称：`MarkNest - 本地 Markdown 阅读与编辑器`
- 分类建议：`生产力`
- 可见性建议：`公开`
- 市场建议：`所有市场`
- 商店 Logo：`assets/marknest-icon-1024.png`（正方形，满足至少 128 × 128 像素要求）
- 上传包：`.output/marknest-3.0.0-edge.zip`
- 隐私政策 URL：`https://gist.github.com/Oreo-8/c9031224d66599e92ef209e787485f18`

## Partner Center 标识

- 提交状态：`In review`
- Store ID：`0RDCKF3PRV6H`
- CRX ID：`kojaliplnmgbfmkdgnhbifpjpfcgjobd`
- Product ID：`4a5ce0e6-4e8d-4c14-9565-5d58353f96d7`

## 商店详细描述

MarkNest 是一款以本地优先为设计原则的 Markdown 阅读与编辑扩展，让你无需离开浏览器即可打开、预览、修改并保存设备上的 `.md` 和 `.markdown` 文件。

它支持目录导航与搜索、任务列表、表格、代码高亮与复制、数学公式、Mermaid 图表、图片大图预览、主题与字号设置、编辑器宽度调整、拖放打开以及编辑会话恢复。你可以使用 `Ctrl/Command + S` 保存源文件，也可以使用 `Ctrl/Command + Shift + S` 另存为新文件。

MarkNest 还提供由用户主动触发的“收录对话”功能，可将 ChatGPT、Gemini、DeepSeek、通义千问、Grok、豆包、Kimi 和智谱清言的当前对话整理为结构清晰的 Markdown 文件。在点击收录前，扩展不会读取对话正文；生成的内容由用户选择位置并保存到本地。

所有 Markdown 渲染、编辑和对话转换均在浏览器本地完成。MarkNest 不会将本地文件、对话内容、浏览历史或偏好设置上传到开发者或第三方服务器。

首次使用本地文件功能时，请在 Edge 扩展详情页为 MarkNest 开启“允许访问文件 URL”。

## 搜索词

`Markdown`, `Markdown 编辑器`, `Markdown 阅读器`, `AI 对话导出`, `本地笔记`, `Mermaid`, `公式`

## 单一用途说明

在浏览器中本地阅读、编辑和保存 Markdown 文档，并把用户主动选择的 AI 对话转换为 Markdown 文档。

## 权限理由

- `storage`：在浏览器本地保存外观设置、编辑会话和用户主动生成的待打开文档，不上传到服务器。
- `activeTab`：仅在用户点击“收录对话”时识别并读取当前活动的受支持 AI 对话标签页。
- `scripting`：当受支持 AI 页面在扩展安装或更新前已打开、尚未加载内容脚本时，按用户操作注入随扩展打包的对话读取脚本。
- `downloads`：把用户主动生成的 Markdown 文件保存到用户选择的本地位置。
- `file:///*`：读取用户主动打开的本地 `.md` 或 `.markdown` 文件，用于预览、编辑和保存。
- AI 网站主机权限：识别受支持的网站，并只在用户主动执行“收录对话”后读取当前对话内容。

## 远程代码声明

选择：`否，我没有使用远程代码`。

说明：所有可执行 JavaScript 均随 Manifest V3 扩展包一起提供。扩展不会下载或执行远程脚本；动态导入的 Mermaid 模块也已由构建工具打包在扩展压缩包内。

## 数据使用声明

扩展会在用户主动操作时访问本地 Markdown 文件和当前 AI 对话内容，但不会把这些内容传输给开发者或第三方服务器。应按 Partner Center 当前表单准确勾选“网站内容/用户活动”等适用的数据访问类别，并声明数据仅用于扩展的核心单一用途、不出售、不用于广告或信用评估。

## 认证测试说明

1. 安装扩展后，在扩展详情页开启“允许访问文件 URL”。
2. 在 Edge 中打开任意本地 `.md` 文件，验证预览、编辑、`Ctrl+S` 保存和 `Ctrl+Shift+S` 另存为。
3. 打开受支持 AI 网站的一段对话，点击 MarkNest 工具栏图标，再点击“收录对话”。选择本地保存位置后，验证生成的 Markdown 文件以及随后打开的 MarkNest 编辑页。
4. 扩展不需要测试账号、后端服务或付费功能。所有处理均在浏览器本地完成。
