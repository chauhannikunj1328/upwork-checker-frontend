"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Copy, Check } from "lucide-react";

import { getUser, logout } from "@/lib/auth";
import api from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── types ────────────────────────────────────────────────────────────────────

interface ScoreResult {
  overall_score: number;
  sub_scores: {
    hook_strength: number;
    personalization: number;
    portfolio_proof: number;
    clarity_grammar: number;
    length_readability: number;
    call_to_action: number;
  };
  penalties_applied: string[];
  critique: { line: string; issue: string; fix: string }[];
  rewritten_letter: string;
  word_count_original: number;
  word_count_rewritten: number;
}

interface User {
  name: string;
  email: string;
}

// ── validation ────────────────────────────────────────────────────────────────

const schema = z.object({
  job_post: z.string().min(50, "Job post must be at least 50 characters"),
  cover_letter: z.string().min(30, "Cover letter must be at least 30 characters"),
  portfolio: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ── sub-score labels ──────────────────────────────────────────────────────────

const SUB_SCORE_LABELS: Record<keyof ScoreResult["sub_scores"], string> = {
  hook_strength: "Hook Strength",
  personalization: "Personalization",
  portfolio_proof: "Portfolio Proof",
  clarity_grammar: "Clarity & Grammar",
  length_readability: "Length & Readability",
  call_to_action: "Call to Action",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function scoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 8.5) return "default";
  if (score >= 6.5) return "secondary";
  return "destructive";
}

function scoreBadgeClass(score: number): string {
  if (score >= 8.5) return "bg-green-500 hover:bg-green-500 text-white";
  if (score >= 6.5) return "bg-yellow-500 hover:bg-yellow-500 text-white";
  return "";
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// ── components ────────────────────────────────────────────────────────────────

function ResultSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full min-h-[300px]">
      <p className="text-muted-foreground text-sm text-center px-6">
        Submit a proposal to see your score
      </p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function ScoreResult({ result }: { result: ScoreResult }) {
  return (
    <div className="space-y-5 p-1">
      {/* Overall score */}
      <div className="flex items-center gap-3">
        <span className="text-4xl font-bold tabular-nums">
          {result.overall_score.toFixed(1)}
          <span className="text-xl text-muted-foreground font-normal"> / 10</span>
        </span>
        <Badge className={scoreBadgeClass(result.overall_score)} variant={scoreBadgeVariant(result.overall_score)}>
          {result.overall_score >= 8.5 ? "Excellent" : result.overall_score >= 6.5 ? "Good" : "Needs Work"}
        </Badge>
      </div>

      <Separator />

      {/* Sub-scores */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Sub-scores</h3>
        <div className="space-y-3">
          {(Object.keys(SUB_SCORE_LABELS) as (keyof ScoreResult["sub_scores"])[]).map((key) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{SUB_SCORE_LABELS[key]}</span>
                <span className="font-medium tabular-nums">{result.sub_scores[key]} / 10</span>
              </div>
              <Progress value={result.sub_scores[key] * 10} className="h-1.5" />
            </div>
          ))}
        </div>
      </div>

      {/* Penalties */}
      {result.penalties_applied.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-2">Penalties Applied</h3>
            <div className="flex flex-wrap gap-2">
              {result.penalties_applied.map((p, i) => (
                <Badge key={i} variant="destructive" className="text-xs font-normal">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Critique */}
      {result.critique.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-2">Critique</h3>
            <div className="space-y-2">
              {result.critique.map((item, i) => (
                <div key={i} className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                  <p className="italic text-muted-foreground">"{item.line}"</p>
                  <p><span className="font-medium text-destructive">Issue:</span> {item.issue}</p>
                  <p><span className="font-medium text-green-600">Fix:</span> {item.fix}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Rewritten letter */}
      <Separator />
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Rewritten Letter</h3>
          <CopyButton text={result.rewritten_letter} />
        </div>
        <ScrollArea className="h-48 rounded-md border bg-muted/40 p-3">
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {result.rewritten_letter}
          </pre>
        </ScrollArea>
      </div>

      {/* Word count */}
      <p className="text-xs text-muted-foreground">
        Original: {result.word_count_original} words • Rewritten: {result.word_count_rewritten} words
      </p>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const coverLetterValue = useWatch({ control, name: "cover_letter", defaultValue: "" });

  useEffect(() => {
    getUser()
      .then(setUser)
      .catch(() => router.replace("/login"));
  }, [router]);

  async function onSubmit(values: FormData) {
    setLoading(true);
    try {
      const { data } = await api.post<ScoreResult>("/score", values);
      setResult(data);
      // scroll to results on mobile
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Scoring failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 h-14 flex items-center justify-between">
        <span className="font-semibold text-sm sm:text-base">Upwork Proposal Checker</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Two-column layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* LEFT — form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score your proposal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Job post */}
              <div className="space-y-1.5">
                <Label htmlFor="job_post">Job post <span className="text-destructive">*</span></Label>
                <Textarea
                  id="job_post"
                  rows={8}
                  placeholder="Paste the full job description here…"
                  {...register("job_post")}
                />
                {errors.job_post && (
                  <p className="text-xs text-destructive">{errors.job_post.message}</p>
                )}
              </div>

              {/* Cover letter */}
              <div className="space-y-1.5">
                <Label htmlFor="cover_letter">Your cover letter <span className="text-destructive">*</span></Label>
                <Textarea
                  id="cover_letter"
                  rows={8}
                  placeholder="Paste your cover letter here…"
                  {...register("cover_letter")}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {wordCount(coverLetterValue ?? "")} words
                </p>
                {errors.cover_letter && (
                  <p className="text-xs text-destructive">{errors.cover_letter.message}</p>
                )}
              </div>

              {/* Portfolio */}
              <div className="space-y-1.5">
                <Label htmlFor="portfolio">Your portfolio summary</Label>
                <Textarea
                  id="portfolio"
                  rows={4}
                  placeholder="Brief summary of relevant past work"
                  {...register("portfolio")}
                />
                <p className="text-xs text-muted-foreground">
                  Brief summary of relevant past work
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scoring…
                  </>
                ) : (
                  "Score it"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* RIGHT — results */}
        <Card ref={resultsRef} className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ResultSkeleton />
            ) : result ? (
              <ScoreResult result={result} />
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
