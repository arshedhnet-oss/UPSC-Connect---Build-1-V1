import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-6xl mx-auto border-b border-border">
      <div className="flex items-center gap-4 sm:gap-6">
        <Link to="/" className="font-display text-lg sm:text-xl font-bold text-foreground">
          UPSC Connect
        </Link>
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant={isActive("/mentors") ? "secondary" : "ghost"}
            size="sm"
            asChild
          >
            <Link to="/mentors">Find Mentors</Link>
          </Button>
          <Button
            variant={isActive("/#how-it-works") ? "secondary" : "ghost"}
            size="sm"
            asChild
          >
            <Link to="/#how-it-works">How It Works</Link>
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {user && profile ? (
          <>
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-display">
                {profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">{profile.name}</span>
            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">{profile.role}</Badge>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            {/* Mobile: show Find Mentors link */}
            <Button variant="ghost" size="sm" asChild className="sm:hidden">
              <Link to="/mentors">Mentors</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Sign Up</Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
