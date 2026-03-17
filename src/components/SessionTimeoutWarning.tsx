import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

interface SessionTimeoutWarningProps {
  open: boolean;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

const SessionTimeoutWarning = ({ open, onStayLoggedIn, onLogout }: SessionTimeoutWarningProps) => {
  const [countdown, setCountdown] = useState(120);

  useEffect(() => {
    if (!open) {
      setCountdown(120);
      return;
    }
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, onLogout]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm sm:max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <Clock className="h-6 w-6 text-accent" />
          </div>
          <AlertDialogTitle className="text-center font-display text-lg">
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Your session is about to expire due to inactivity. You will be
            logged out in{" "}
            <span className="font-semibold text-foreground">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onLogout} className="w-full sm:w-auto gap-2">
            <LogOut className="h-4 w-4" />
            Logout Now
          </Button>
          <Button onClick={onStayLoggedIn} className="w-full sm:w-auto">
            Stay Logged In
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SessionTimeoutWarning;
