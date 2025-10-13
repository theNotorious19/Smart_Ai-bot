import { StreamChunk } from "@/types/chat";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function* streamChat(message: string, image?: string): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ message, image }),
  });

  if (!response.ok) {
    throw new Error(`AI chat error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    
    // Keep the last incomplete line in the buffer
    buffer = lines.pop() || "";
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      try {
        const chunk: StreamChunk = JSON.parse(trimmed);
        yield chunk;
      } catch (e) {
        console.error("Failed to parse chunk:", trimmed, e);
      }
    }
  }
  
  // Process any remaining data in buffer
  if (buffer.trim()) {
    try {
      const chunk: StreamChunk = JSON.parse(buffer.trim());
      yield chunk;
    } catch (e) {
      console.error("Failed to parse final chunk:", buffer, e);
    }
  }
}

export async function getAvailableTools() {
  // Tools are now defined in the edge function
  return [
    { name: "Weather Tool", description: "Get current weather for a city" },
    { name: "Calculator", description: "Perform math operations" },
    { name: "Image Generator", description: "Generate images from text" },
    { name: "Database Query", description: "Query a mock database" },
    { name: "File Operations", description: "Read/write mock files" }
  ];
}
