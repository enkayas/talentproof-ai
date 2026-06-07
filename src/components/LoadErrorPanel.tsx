import { AlertCircle, RefreshCw } from "lucide-react";

export function LoadErrorPanel({
  message,
  onRetry,
  title = "Couldn't load this data",
}: {
  message: string;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 mb-3">
        <AlertCircle className="h-5 w-5 text-destructive" />
      </div>
      <p className="text-foreground font-medium mb-1">{title}</p>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto break-words">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
