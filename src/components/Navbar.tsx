import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ENABLE_ORGANISATIONS } from "@/lib/featureFlags";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, LayoutDashboard, CalendarCheck, User, Menu, MessageCircle, Users } from "lucide-react";
import NotificationBellComponent from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const unreadCount = useUnreadCount();

  const isActive = (path: string) => location.pathname === path;

  const scrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === "/") {
      document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#how-it-works");
      setTimeout(() => {
        document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const ChatBell = () => (
    <Link to="/chat" className="relative">
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  );

  return (
    <nav className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-6xl mx-auto border-b border-border">
      <div className="flex items-center gap-4 sm:gap-6">
        <Link to="/" className="font-display text-lg sm:text-xl font-bold text-foreground">
          UPSC Connect
        </Link>
        <div className="hidden sm:flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild className={isActive("/mentors") ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}>
            <Link to="/mentors">Find Mentors</Link>
          </Button>
          {ENABLE_ORGANISATIONS && (
            <Button variant="ghost" size="sm" asChild className={isActive("/organisations") ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}>
              <Link to="/organisations">Organisations</Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={scrollToHowItWorks}>
            How It Works
          </Button>
          <Button variant="ghost" size="sm" asChild className={isActive("/community") ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}>
            <Link to="/community">Community</Link>
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile nav links */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className={`sm:hidden text-xs px-2 ${isActive("/mentors") ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "border border-input"}`}
        >
          <Link to="/mentors">Mentors</Link>
        </Button>
        {ENABLE_ORGANISATIONS && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className={`sm:hidden text-xs px-2 ${isActive("/organisations") ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "border border-input"}`}
          >
            <Link to="/organisations">Orgs</Link>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollToHowItWorks}
          className="sm:hidden text-xs px-2 border border-input"
        >
          How
        </Button>

        {user && profile ? (
          <>
            {/* Notification Bell */}
            <NotificationBellComponent />
            <ChatBell />

            {/* Desktop dropdown */}
            <div className="hidden sm:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-display">
                        {profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">{profile.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-medium text-foreground">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={ENABLE_ORGANISATIONS && profile.role === "institute_admin" ? "/institute/dashboard" : "/dashboard"} className="flex items-center gap-2 cursor-pointer">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {profile.role !== "institute_admin" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/chat" className="flex items-center gap-2 cursor-pointer">
                          <MessageCircle className="h-4 w-4" /> Messages
                          {unreadCount > 0 && (
                            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard#bookings" className="flex items-center gap-2 cursor-pointer">
                          <CalendarCheck className="h-4 w-4" /> My Bookings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard#profile" className="flex items-center gap-2 cursor-pointer">
                          <User className="h-4 w-4" /> Profile
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile hamburger menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="sm:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <SheetHeader className="text-left">
                  <SheetTitle className="font-display">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex items-center gap-3 mt-4 mb-6 px-1">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
                    <AvatarFallback className="text-sm bg-primary/10 text-primary font-display">
                      {profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    className={`justify-start gap-2 ${isActive(ENABLE_ORGANISATIONS && profile.role === "institute_admin" ? "/institute/dashboard" : "/dashboard") ? "bg-accent text-accent-foreground font-semibold border-l-2 border-primary rounded-l-none" : ""}`}
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to={ENABLE_ORGANISATIONS && profile.role === "institute_admin" ? "/institute/dashboard" : "/dashboard"}>
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className={`justify-start gap-2 ${isActive("/chat") ? "bg-accent text-accent-foreground font-semibold border-l-2 border-primary rounded-l-none" : ""}`}
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to="/chat">
                      <MessageCircle className="h-4 w-4" /> Messages
                      {unreadCount > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className={`justify-start gap-2 ${location.hash === "#bookings" && location.pathname === "/dashboard" ? "bg-accent text-accent-foreground font-semibold border-l-2 border-primary rounded-l-none" : ""}`}
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to="/dashboard#bookings">
                      <CalendarCheck className="h-4 w-4" /> My Bookings
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className={`justify-start gap-2 ${location.hash === "#profile" && location.pathname === "/dashboard" ? "bg-accent text-accent-foreground font-semibold border-l-2 border-primary rounded-l-none" : ""}`}
                    asChild
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to="/dashboard#profile">
                      <User className="h-4 w-4" /> Profile
                    </Link>
                  </Button>
                  <div className="border-t border-border my-2" />
                  <Button
                    variant="ghost"
                    className="justify-start gap-2 text-destructive hover:text-destructive"
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild className="hidden sm:inline-flex">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
