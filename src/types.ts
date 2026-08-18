export interface InitialLocalFile {
  name: string
  content: string
  sourceUrl: string
}

export interface EditorSession {
  name: string
  content: string
  sourceUrl: string | null
  unsaved: boolean
  updatedAt: number
}

export interface HeadingItem {
  level: number
  text: string
  id: string
}

export interface UserSettings {
  theme: 'dark' | 'light'
  fontSize: number
  contentCentered: boolean
  editorWidth: number | null
}

declare global {
  interface FilePickerAcceptType {
    description?: string
    accept: Record<string, string[]>
  }

  interface OpenFilePickerOptions {
    multiple?: boolean
    types?: FilePickerAcceptType[]
  }

  interface SaveFilePickerOptions {
    suggestedName?: string
    types?: FilePickerAcceptType[]
  }

  interface Window {
    __markdownInitialFile?: InitialLocalFile
    showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>
  }

  interface FileSystemFileHandle {
    queryPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
    requestPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  }

  interface DataTransferItem {
    getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>
  }
}
