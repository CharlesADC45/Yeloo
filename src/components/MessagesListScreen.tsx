import { ArrowLeft, Search } from "lucide-react";
import { Input } from "./ui/input";

interface MessagesListScreenProps {
  onBack: () => void;
  onChatSelect: (landlordName: string) => void;
}

const mockConversations = [
  {
    id: "1",
    name: "Sarah Johnson",
    lastMessage: "Great! I have availability this Thursday or Friday afternoon.",
    timestamp: "2m ago",
    unread: 2,
    avatar: "S",
  },
  {
    id: "2",
    name: "Mike Chen",
    lastMessage: "The apartment is still available. Would you like to schedule a viewing?",
    timestamp: "1h ago",
    unread: 0,
    avatar: "M",
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    lastMessage: "Thanks for your interest! The move-in date is flexible.",
    timestamp: "3h ago",
    unread: 1,
    avatar: "E",
  },
  {
    id: "4",
    name: "David Kim",
    lastMessage: "Yes, pets are welcome with a small deposit.",
    timestamp: "1d ago",
    unread: 0,
    avatar: "D",
  },
  {
    id: "5",
    name: "Jessica Taylor",
    lastMessage: "I can send you more photos if you'd like!",
    timestamp: "2d ago",
    unread: 0,
    avatar: "J",
  },
  {
    id: "6",
    name: "Robert Martinez",
    lastMessage: "The building has a gym and rooftop access.",
    timestamp: "3d ago",
    unread: 0,
    avatar: "R",
  },
];

export function MessagesListScreen({ onBack, onChatSelect }: MessagesListScreenProps) {
  return (
    <div className="h-full bg-background flex flex-col">
      <div className="flex items-center justify-between p-6 border-b border-border lg:hidden">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h4 className="text-foreground">Messages</h4>
        <div className="w-10" />
      </div>

      <div className="hidden lg:block p-6 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-foreground">Messages</h2>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-12 h-12 lg:h-14 rounded-2xl bg-input-background border-0"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {mockConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onChatSelect(conversation.name)}
              className="w-full flex items-center space-x-4 p-6 hover:bg-muted transition-colors border-b border-border"
            >
              <div className="relative">
                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-primary-foreground flex-shrink-0">
                  <span className="text-xl">{conversation.avatar}</span>
                </div>
                {conversation.unread > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                    <span className="text-xs">{conversation.unread}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 text-left overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-foreground">{conversation.name}</h4>
                  <p className="text-muted-foreground text-xs">{conversation.timestamp}</p>
                </div>
                <p
                  className={`text-muted-foreground truncate ${
                    conversation.unread > 0 ? "font-medium" : ""
                  }`}
                >
                  {conversation.lastMessage}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}