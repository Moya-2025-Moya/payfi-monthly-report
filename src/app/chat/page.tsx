import { PageHeader } from '@/components/ui/PageHeader'
import { ChatClient } from './ChatClient'

export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PageHeader title="AI Chat" description="Ask questions about verified facts" />
      <ChatClient />
    </div>
  )
}
