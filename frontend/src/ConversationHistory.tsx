import { useState } from 'react'
import { Check, MessageSquareText, Pencil, Trash2, X } from 'lucide-react'
import { MAX_THREADS, type SavedThread } from './history'

export function ConversationHistory({ threads, currentId, onSelect, onRename, onDelete, onClear }: {
  threads: SavedThread[]
  currentId: string
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onClear: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  function beginEdit(thread: SavedThread) {
    setEditingId(thread.id)
    setEditingTitle(thread.title)
  }
  function saveEdit() {
    if (editingId && editingTitle.trim()) onRename(editingId, editingTitle)
    setEditingId(null)
  }
  function deleteOne(thread: SavedThread) {
    if (window.confirm('确定删除「' + thread.title + '」？删除后无法恢复。')) {
      if (editingId === thread.id) setEditingId(null)
      onDelete(thread.id)
    }
  }

  return <section className="history-panel" aria-label="历史对话">
    <div className="history-heading">
      <strong>历史对话</strong>
      {threads.length > 0 && <button type="button" title="清空历史" aria-label="清空全部历史对话"
        onClick={() => { if (window.confirm('清空本浏览器保存的全部聊天记录？此操作无法撤销。')) { setEditingId(null); onClear() } }}>
        <Trash2 size={14}/>
      </button>}
    </div>
    <div className="history-list">
      {threads.length === 0 && <p className="history-empty">发送消息后，记录将显示在这里。</p>}
      {threads.map(thread => <div className={currentId === thread.id ? 'history-item selected' : 'history-item'} key={thread.id}>
        {editingId === thread.id ?
          <div className="history-edit">
            <input autoFocus maxLength={60} aria-label="对话标题" value={editingTitle}
              onChange={event => setEditingTitle(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') saveEdit()
                if (event.key === 'Escape') setEditingId(null)
              }}/>
            <button type="button" aria-label="保存标题" onClick={saveEdit}><Check size={14}/></button>
            <button type="button" aria-label="取消重命名" onClick={() => setEditingId(null)}><X size={14}/></button>
          </div> :
          <>
            <button type="button" className="history-open" aria-current={currentId === thread.id ? 'page' : undefined}
              aria-label={'打开对话：' + thread.title} title={thread.title} onClick={() => onSelect(thread.id)}>
              <MessageSquareText size={15}/><span>{thread.title}</span>
            </button>
            <div className="history-actions">
              <button type="button" aria-label={'重命名对话：' + thread.title} title="重命名" onClick={() => beginEdit(thread)}><Pencil size={13}/></button>
              <button type="button" aria-label={'删除对话：' + thread.title} title="删除" onClick={() => deleteOne(thread)}><Trash2 size={13}/></button>
            </div>
          </>}
      </div>)}
    </div>
    <p className="history-note">仅保存在此浏览器 · 最近 {MAX_THREADS} 个对话</p>
  </section>
}
