if (/\.(md|markdown)$/i.test(location.pathname)) {
  const file = {
    name: decodeURIComponent(location.pathname.split('/').pop() || '未命名.md'),
    content: document.querySelector('pre')?.textContent ?? document.body?.innerText ?? '',
    sourceUrl: location.href,
  }
  void chrome.runtime.sendMessage({ type: 'OPEN_LOCAL_FILE', file }).then((result: { ok?: boolean; editorUrl?: string; error?: string }) => {
    if (!result?.ok || !result.editorUrl) throw new Error(result?.error || '编辑页地址无效')

    const frame = document.createElement('iframe')
    frame.src = result.editorUrl
    frame.title = `MarkNest · ${file.name}`
    frame.allow = 'clipboard-read; clipboard-write'
    Object.assign(frame.style, {
      display: 'block',
      width: '100vw',
      height: '100vh',
      border: '0',
      background: '#111218',
    })

    document.documentElement.replaceChildren(document.createElement('head'), document.createElement('body'))
    document.title = file.name
    document.documentElement.style.cssText = 'width:100%;height:100%;margin:0;overflow:hidden;background:#111218'
    document.body.style.cssText = 'width:100%;height:100%;margin:0;overflow:hidden'
    document.body.append(frame)
  }).catch((error) => {
    console.error('MarkNest 无法打开本地 Markdown 文件：', error)
  })
}
