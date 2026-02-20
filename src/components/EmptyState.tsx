import { Button } from "./ui/button";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
        <span className="text-5xl">{icon}</span>
      </div>
      <h3 className="text-foreground mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "100ms", animationFillMode: "backwards" }}>
        {title}
      </h3>
      <p className="text-muted-foreground max-w-xs mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "200ms", animationFillMode: "backwards" }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: "300ms", animationFillMode: "backwards" }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}