export type ServiceCategory = 'ai' | 'office' | 'download'
export type Service = {
  id: string
  name: string
  description: string
  category: ServiceCategory
  type: 'web' | 'windows' | 'workspace'
  url: string
  demo?: boolean
}

// Links are environment configuration, never guessed from another project.
// No sensitive token should be put in a VITE_ variable (browser-visible).
export const catalog: Service[] = [
  {
    id: 'presentation', name: 'AI Presentation',
    description: '沟通思路、组织故事板、生成 AUMOVIO 演示文稿',
    category: 'ai', type: 'workspace', url: '', demo: true,
  },
  {
    id: 'gemba', name: 'AI Gemba',
    description: '生产指标分析、异常定位与证据追溯',
    category: 'ai', type: 'web', url: import.meta.env.VITE_GEMBA_URL || '',
  },
  {
    id: 'meeting', name: '龙小智会议助手',
    description: '会议录音、实时转写与 AI 纪要',
    category: 'download', type: 'windows', url: import.meta.env.VITE_MEETING_DOWNLOAD_URL || '',
  },
  {
    id: 'knowledge', name: '知识助手',
    description: '探索已授权的内部知识与资料',
    category: 'ai', type: 'web', url: import.meta.env.VITE_KNOWLEDGE_URL || '',
  },
  {
    id: 'workflow', name: 'Workflow',
    description: '日常业务流程与任务入口',
    category: 'office', type: 'web', url: import.meta.env.VITE_WORKFLOW_URL || '',
  },
  {
    id: 'pdf', name: 'PDF 工具',
    description: '已部署的文档处理服务',
    category: 'office', type: 'web', url: import.meta.env.VITE_PDF_TOOL_URL || '',
  },
  {
    id: 'tools', name: '办公工具箱',
    description: '其他常用的内部在线办公服务',
    category: 'office', type: 'web', url: import.meta.env.VITE_OFFICE_TOOLS_URL || '',
  },
]
