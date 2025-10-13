import { useChat } from "@/hooks/useChat";
import ChatContainer from "@/components/chat/ChatContainer";
import ChatInput from "@/components/chat/ChatInput";
import { Sparkles } from "lucide-react";

const Index = () => {
  const { messages, isStreaming, sendMessage } = useChat();

  return (
    <div className="flex flex-col h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Assistant</h1>
              <p className="text-xs text-muted-foreground">Powered by streaming AI with tool support</p>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 container mx-auto flex flex-col overflow-hidden max-w-4xl">
        <ChatContainer messages={messages} />
        
        {/* Input Area */}
        <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4 shadow-lg">
          <ChatInput onSend={sendMessage} disabled={isStreaming} />
        </div>
      </main>
    </div>
  );
};

export default Index;
