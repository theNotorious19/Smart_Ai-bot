import { useState, useCallback } from "react";
import { Message, StreamChunk, ToolInfo } from "@/types/chat";
import { streamChat } from "@/services/chatApi";
import { useToast } from "@/hooks/use-toast";

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const { toast } = useToast();

  const sendMessage = useCallback(async (content: string, image?: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
      image,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    let assistantContent = "";
    let assistantTools: ToolInfo[] = [];

    const updateAssistantMessage = (partial: Partial<Message>) => {
      setMessages((prev) => {
        const existing = prev.find((m) => m.id === assistantMessageId);
        if (existing) {
          return prev.map((m) =>
            m.id === assistantMessageId ? { ...m, ...partial } : m
          );
        } else {
          return [
            ...prev,
            {
              id: assistantMessageId,
              role: "assistant" as const,
              content: "",
              timestamp: new Date(),
              streaming: true,
              ...partial,
            },
          ];
        }
      });
    };

    try {
      for await (const chunk of streamChat(content, image)) {
        switch (chunk.type) {
          case "text":
            assistantContent += chunk.content;
            updateAssistantMessage({ content: assistantContent, streaming: true });
            break;

          case "tool_call":
            if (chunk.tool) {
              const existingToolIndex = assistantTools.findIndex(
                (t) => t.id === chunk.tool!.id
              );
              
              if (existingToolIndex >= 0) {
                assistantTools[existingToolIndex] = {
                  ...assistantTools[existingToolIndex],
                  ...chunk.tool,
                };
              } else {
                assistantTools.push(chunk.tool);
              }
              
              updateAssistantMessage({
                content: assistantContent,
                tools: [...assistantTools],
                streaming: true,
              });
            }
            break;

          case "tool_result":
            if (chunk.tool) {
              const toolIndex = assistantTools.findIndex(
                (t) => t.id === chunk.tool!.id
              );
              
              if (toolIndex >= 0) {
                assistantTools[toolIndex] = {
                  ...assistantTools[toolIndex],
                  status: "completed",
                  result: chunk.tool.result,
                };
                
                updateAssistantMessage({
                  content: assistantContent,
                  tools: [...assistantTools],
                  streaming: true,
                });
              }
            }
            break;

          case "error":
            toast({
              title: "Error",
              description: chunk.content,
              variant: "destructive",
            });
            
            if (chunk.tool) {
              const toolIndex = assistantTools.findIndex(
                (t) => t.id === chunk.tool!.id
              );
              if (toolIndex >= 0) {
                assistantTools[toolIndex].status = "failed";
                updateAssistantMessage({
                  content: assistantContent,
                  tools: [...assistantTools],
                });
              }
            }
            break;

          case "done":
            updateAssistantMessage({
              content: assistantContent,
              tools: assistantTools,
              streaming: false,
            });
            break;
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to the AI service. Please try again.",
        variant: "destructive",
      });
      
      // Remove the incomplete assistant message
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
    } finally {
      setIsStreaming(false);
    }
  }, [toast]);

  return {
    messages,
    isStreaming,
    sendMessage,
  };
};
