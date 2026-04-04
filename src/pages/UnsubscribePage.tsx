import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const UnsubscribePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "error" | "success">("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("error");
      } catch { setStatus("error"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          {status === "loading" && <p className="text-muted-foreground">Validating...</p>}
          {status === "valid" && (
            <>
              <h2 className="font-display text-xl font-bold text-foreground">Unsubscribe from emails</h2>
              <p className="text-muted-foreground text-sm">You will no longer receive app emails from UPSC Connect.</p>
              <Button onClick={handleUnsubscribe} variant="destructive">Confirm Unsubscribe</Button>
            </>
          )}
          {status === "success" && (
            <>
              <h2 className="font-display text-xl font-bold text-foreground">Unsubscribed</h2>
              <p className="text-muted-foreground text-sm">You have been successfully unsubscribed.</p>
            </>
          )}
          {status === "already" && (
            <>
              <h2 className="font-display text-xl font-bold text-foreground">Already unsubscribed</h2>
              <p className="text-muted-foreground text-sm">This email address has already been unsubscribed.</p>
            </>
          )}
          {status === "error" && (
            <>
              <h2 className="font-display text-xl font-bold text-foreground">Invalid link</h2>
              <p className="text-muted-foreground text-sm">This unsubscribe link is invalid or has expired.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnsubscribePage;
