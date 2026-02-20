import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface ChatScreenProps {
  onBack: () => void;
  landlordName?: string;
}

const mockMessages = [
  {
    id: "1",
    sender: "landlord",
    text: "Hi! Thanks for your interest in the apartment. How can I help you?",
    timestamp: "10:30 AM",
  },
  {
    id: "2",
    sender: "user",
    text: "Hello! I'd love to schedule a viewing. When would be a good time?",
    timestamp: "10:32 AM",
  },
  {
    id: "3",
    sender: "landlord",
    text: "Great! I have availability this Thursday or Friday afternoon. Would either of those work for you?",
    timestamp: "10:35 AM",
  },
  {
    id: "4",
    sender: "user",
    text: "Friday afternoon works perfectly for me. What time?",
    timestamp: "10:37 AM",
  },
];

export function ChatScreen({ onBack, landlordName = "Sarah Johnson" }: ChatScreenProps) {
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (newMessage.trim()) {
      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          sender: "user",
          text: newMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setNewMessage("");
    }
  };

  return (
    <div className="h-full bg-background flex flex-col">
      <div className="flex items-center space-x-4 p-6 border-b border-border bg-card lg:hidden">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
            {landlordName.charAt(0)}
          </div>
          <div>
            <h4 className="text-foreground">{landlordName}</h4>
            <p className="text-muted-foreground">Online</p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center space-x-4 p-6 border-b border-border bg-card">
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
            {landlordName.charAt(0)}
          </div>
          <div>
            <h3 className="text-foreground">{landlordName}</h3>
            <p className="text-muted-foreground">Online</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[75%] lg:max-w-md space-y-1">
                <div
                  className={`p-4 rounded-2xl ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <p>{message.text}</p>
                </div>
                <p
                  className={`text-xs text-muted-foreground ${
                    message.sender === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 border-t border-border bg-card">
        <div className="max-w-4xl mx-auto flex items-center space-x-3">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 h-12 lg:h-14 rounded-2xl bg-input-background border-0"
          />
          <Button
            onClick={handleSend}
            size="icon"
            className="h-12 w-12 lg:h-14 lg:w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}