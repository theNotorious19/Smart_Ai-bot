import { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import ToolCallCard from "./ToolCallCard";

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-md",
          isUser
            ? "bg-user-bubble text-user-foreground rounded-br-sm"
            : "bg-ai-bubble text-ai-foreground rounded-bl-sm border border-border"
        )}
      >
        {message.image && isUser && (
          <img 
            src={message.image} 
            alt="Uploaded" 
            className="rounded-lg max-w-full max-h-64 object-contain mb-2"
          />
        )}
        {message.content && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
            {message.streaming && (
              <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
            )}
          </div>
        )}
        
        {message.tools && message.tools.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.tools.map((tool) => (
              <ToolCallCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
