import { PageHeader } from '@/components/ui/PageHeader'
import { ChatClient } from './ChatClient'

export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PageHeader title="AI 对话" description="基于已验证事实进行智能问答" />
      <ChatClient />
    </div>
  )
}
