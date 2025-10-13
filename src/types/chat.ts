export type MessageType = "text" | "tool_call" | "tool_result" | "error" | "done";

export type ToolStatus = "pending" | "running" | "completed" | "failed";

export interface ToolInfo {
  name: string;
  id: string;
  status: ToolStatus;
  result?: any;
  args?: any;
}

export interface StreamChunk {
  type: MessageType;
  content: string;
  tool?: ToolInfo;
  timestamp: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tools?: ToolInfo[];
  streaming?: boolean;
  image?: string; // base64 image data
}
