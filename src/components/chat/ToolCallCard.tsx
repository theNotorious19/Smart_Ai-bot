import { useState } from "react";
import { ToolInfo } from "@/types/chat";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ToolCallCardProps {
  tool: ToolInfo;
}

const ToolCallCard = ({ tool }: ToolCallCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (tool.status) {
      case "pending":
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case "running":
        return <Loader2 className="w-4 h-4 animate-spin text-warning" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusColor = () => {
    switch (tool.status) {
      case "pending":
        return "bg-muted";
      case "running":
        return "bg-warning/10 border-warning/30";
      case "completed":
        return "bg-success/10 border-success/30";
      case "failed":
        return "bg-destructive/10 border-destructive/30";
    }
  };

  const hasResult = tool.status === "completed" && tool.result;
  
  // Check if result is an image (either direct URL or object with imageUrl)
  const imageUrl = typeof tool.result === "object" && tool.result?.imageUrl 
    ? tool.result.imageUrl 
    : typeof tool.result === "string" && (tool.result.startsWith("http") || tool.result.startsWith("data:image"))
    ? tool.result
    : null;
  
  const isImage = tool.name === "generate_image" && imageUrl;

  return (
    <Card className={cn("transition-all duration-200", getStatusColor())}>
      <CardHeader
        className="py-2 px-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon()}
            <span className="text-sm font-medium truncate">{tool.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground capitalize">{tool.status}</span>
            {hasResult && (
              isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && hasResult && (
        <CardContent className="px-3 py-2 pt-0 animate-in slide-in-from-top-1 duration-200">
          <div className="mt-2 p-2 bg-secondary/50 rounded-lg">
            {isImage && imageUrl ? (
              <div className="space-y-2">
                <img
                  src={imageUrl}
                  alt="Generated"
                  className="w-full rounded-md shadow-sm max-h-64 object-contain bg-background"
                />
                {typeof tool.result === "object" && tool.result?.description && (
                  <p className="text-xs text-muted-foreground">{tool.result.description}</p>
                )}
              </div>
            ) : (
              <pre className="text-xs text-foreground whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {typeof tool.result === "string" 
                  ? tool.result 
                  : JSON.stringify(tool.result, null, 2)}
              </pre>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ToolCallCard;
