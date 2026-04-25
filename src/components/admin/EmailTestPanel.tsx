import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, CheckCircle2, XCircle, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TEST_RECIPIENT = "arshedopera.21@gmail.com";

interface TemplateResult {
  template: string;
  success: boolean;
  error?: string;
}

interface TestRunSummary {
  runId: string;
  recipient: string;
  total: number;
  sent: number;
  failed: number;
  results: TemplateResult[];
  timestamp: string;
}

export const EmailTestPanel = () => {
  const [testMode, setTestMode] = useState(false);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<TestRunSummary | null>(null);
  const [history, setHistory] = useState<TestRunSummary[]>([]);

  const runTestSuite = async () => {
    if (!testMode) {
      toast.error("Enable Test Email Mode first");
      return;
    }

    setRunning(true);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-test-emails", {
        body: { recipient: TEST_RECIPIENT },
      });

      if (error) throw error;

      const result = data as TestRunSummary;
      setSummary(result);
      setHistory((prev) => [result, ...prev].slice(0, 5));

      if (result.failed === 0) {
        toast.success(`All ${result.sent} test emails enqueued to ${result.recipient}`);
      } else {
        toast.warning(`${result.sent} sent, ${result.failed} failed — check details below`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`Test run failed: ${message}`);
      console.error("Test run failed:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle>Email Testing & Verification</CardTitle>
            <CardDescription>
              Send a sample of every transactional email template to{" "}
              <span className="font-medium text-foreground">{TEST_RECIPIENT}</span> using
              realistic dummy data. Live triggers, schedules, and real users are not affected.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="test-mode" className="text-sm font-medium">
              Test Email Mode
            </Label>
            <p className="text-xs text-muted-foreground">
              Required to enable the send button. All sends are routed to the test recipient only.
            </p>
          </div>
          <Switch
            id="test-mode"
            checked={testMode}
            onCheckedChange={setTestMode}
            disabled={running}
          />
        </div>

        <Button
          onClick={runTestSuite}
          disabled={!testMode || running}
          className="w-full"
          size="lg"
        >
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending test suite…
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Send all template tests to {TEST_RECIPIENT}
            </>
          )}
        </Button>

        {summary && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Last run</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(summary.timestamp).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {summary.sent} sent
                </Badge>
                {summary.failed > 0 && (
                  <Badge variant="destructive">{summary.failed} failed</Badge>
                )}
              </div>
            </div>

            <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {summary.results.map((r) => (
                <li
                  key={r.template}
                  className="flex items-start gap-2 text-xs rounded-md bg-background px-3 py-2 border"
                >
                  {r.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-medium">{r.template}</p>
                    {r.error && (
                      <p className="text-destructive mt-0.5 break-words">{r.error}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {history.length > 1 && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Previous runs ({history.length - 1})
            </summary>
            <ul className="mt-2 space-y-1">
              {history.slice(1).map((h) => (
                <li key={h.runId} className="flex justify-between">
                  <span>
                    {new Date(h.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span>
                  <span>
                    {h.sent}/{h.total} sent
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Verification checklist</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>UPSC Connect header monogram renders</li>
            <li>Consistent typography & spacing across templates</li>
            <li>No raw placeholders ({"{{name}}"}, etc.) visible</li>
            <li>Footer shows: For any queries, contact: admin@upscconnect.in</li>
            <li>Renders correctly on Gmail desktop and mobile</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
