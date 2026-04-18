import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from '@/components/AuthPage';
import { ChatApp } from '@/components/ChatApp';

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ChatFlow — Chat with friends" },
      { name: "description", content: "Send messages, photos, videos and files to your friends in real time." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 bg-primary rounded-full animate-typing" />
            <span className="w-3 h-3 bg-primary rounded-full animate-typing" style={{ animationDelay: '0.2s' }} />
            <span className="w-3 h-3 bg-primary rounded-full animate-typing" style={{ animationDelay: '0.4s' }} />
          </div>
          <span className="text-sm text-muted-foreground">Loading ChatFlow...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <ChatApp userId={user.id} onSignOut={signOut} />;
}
