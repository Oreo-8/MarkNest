void import(chrome.runtime.getURL('file-app.js')).catch((error) => {
  console.error('MarkNest 本地文件界面加载失败：', error)
})
