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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ── types ─────────────────────────────────────────────────────────────────────

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

interface GenerateResult {
  cover_letter: string;
  word_count: number;
}

interface User {
  name: string;
  email: string;
}

// ── validation ────────────────────────────────────────────────────────────────

const checkerSchema = z.object({
  job_post: z.string().min(50, "Job post must be at least 50 characters"),
  cover_letter: z.string().min(30, "Cover letter must be at least 30 characters"),
  portfolio: z.string().optional(),
});

const generatorSchema = z.object({
  job_post: z.string().min(50, "Job post must be at least 50 characters"),
});

type CheckerForm = z.infer<typeof checkerSchema>;
type GeneratorForm = z.infer<typeof generatorSchema>;

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

// ── shared components ─────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center min-h-[260px]">
      <p className="text-muted-foreground text-sm text-center px-4">{text}</p>
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

// ── checker skeletons ─────────────────────────────────────────────────────────

function ScoreSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

function LetterSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i % 3 === 2 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}

// ── checker: score panel ──────────────────────────────────────────────────────

function ScorePanel({ result }: { result: ScoreResult }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-4xl font-bold tabular-nums">
          {result.overall_score.toFixed(1)}
          <span className="text-xl text-muted-foreground font-normal"> / 10</span>
        </span>
        <Badge
          className={scoreBadgeClass(result.overall_score)}
          variant={scoreBadgeVariant(result.overall_score)}
        >
          {result.overall_score >= 8.5 ? "Excellent" : result.overall_score >= 6.5 ? "Good" : "Needs Work"}
        </Badge>
      </div>

      <Separator />

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

      {result.penalties_applied.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-2">Penalties Applied</h3>
            <div className="flex flex-wrap gap-2">
              {result.penalties_applied.map((p, i) => (
                <Badge key={i} variant="destructive" className="text-xs font-normal">{p}</Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {result.critique.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-2">Critique</h3>
            <div className="space-y-2">
              {result.critique.map((item, i) => (
                <div key={i} className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                  <p className="italic text-muted-foreground">&quot;{item.line}&quot;</p>
                  <p><span className="font-medium text-destructive">Issue:</span> {item.issue}</p>
                  <p><span className="font-medium text-green-600">Fix:</span> {item.fix}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── checker: rewritten letter panel ──────────────────────────────────────────

function RewrittenLetterPanel({ result }: { result: ScoreResult }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Original: {result.word_count_original} words · Rewritten: {result.word_count_rewritten} words
        </p>
        <CopyButton text={result.rewritten_letter} />
      </div>
      <ScrollArea className="h-[calc(100vh-14rem)] rounded-md border bg-muted/40 p-4">
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
          {result.rewritten_letter}
        </pre>
      </ScrollArea>
    </div>
  );
}

// ── tab 1: proposal checker ───────────────────────────────────────────────────

function ProposalChecker() {
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const scoreRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, control, formState: { errors } } = useForm<CheckerForm>({
    resolver: zodResolver(checkerSchema),
    defaultValues: { job_post: "", cover_letter: "", portfolio: "" },
  });

  const coverLetterValue = useWatch({ control, name: "cover_letter", defaultValue: "" });

  async function onSubmit(values: CheckerForm) {
    setLoading(true);
    try {
      const { data } = await api.post<ScoreResult>("/score", values);
      setResult(data);
      setTimeout(() => scoreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Scoring failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* Column 1 — inputs */}
      <Card className="xl:sticky xl:top-20 h-fit">
        <CardHeader><CardTitle className="text-base">Score your proposal</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="c-job_post">Job post <span className="text-destructive">*</span></Label>
              <Textarea id="c-job_post" rows={8} placeholder="Paste the full job description here…" {...register("job_post")} />
              {errors.job_post && <p className="text-xs text-destructive">{errors.job_post.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-cover_letter">Your cover letter <span className="text-destructive">*</span></Label>
              <Textarea id="c-cover_letter" rows={8} placeholder="Paste your cover letter here…" {...register("cover_letter")} />
              <p className="text-xs text-muted-foreground text-right">{wordCount(coverLetterValue ?? "")} words</p>
              {errors.cover_letter && <p className="text-xs text-destructive">{errors.cover_letter.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scoring…</> : "Score it"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Column 2 — score */}
      <Card ref={scoreRef} className="h-fit xl:sticky xl:top-20">
        <CardHeader><CardTitle className="text-base">Score</CardTitle></CardHeader>
        <CardContent>
          {loading ? <ScoreSkeleton /> : result ? <ScorePanel result={result} /> : <EmptyState text="Submit a proposal to see your score" />}
        </CardContent>
      </Card>

      {/* Column 3 — rewritten letter */}
      <Card className="h-fit xl:sticky xl:top-20">
        <CardHeader><CardTitle className="text-base">Rewritten Letter</CardTitle></CardHeader>
        <CardContent>
          {loading ? <LetterSkeleton /> : result ? <RewrittenLetterPanel result={result} /> : <EmptyState text="Your AI-rewritten letter will appear here" />}
        </CardContent>
      </Card>
    </div>
  );
}

// ── tab 2: proposal generator ─────────────────────────────────────────────────

function ProposalGenerator() {
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<GeneratorForm>({
    resolver: zodResolver(generatorSchema),
    defaultValues: { job_post: "" },
  });

  async function onSubmit(values: GeneratorForm) {
    setLoading(true);
    try {
      const { data } = await api.post<GenerateResult>("/generate", values);
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Generation failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {/* Column 1 — job post input */}
      <Card className="xl:sticky xl:top-20 h-fit">
        <CardHeader>
          <CardTitle className="text-base">Job post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Textarea
                id="g-job_post"
                rows={14}
                placeholder="Paste the full job description here and we'll generate a tailored cover letter for you…"
                {...register("job_post")}
              />
              {errors.job_post && <p className="text-xs text-destructive">{errors.job_post.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : "Generate cover letter"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Column 2 — generated letter */}
      <Card ref={resultRef} className="h-fit xl:sticky xl:top-20">
        <CardHeader>
          <CardTitle className="text-base">Generated Cover Letter</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 pt-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className={`h-3 ${i % 4 === 3 ? "w-2/3" : "w-full"}`} />
              ))}
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{result.word_count} words</p>
                <CopyButton text={result.cover_letter} />
              </div>
              <ScrollArea className="h-[calc(100vh-12rem)] rounded-md border bg-muted/40 p-4">
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                  {result.cover_letter}
                </pre>
              </ScrollArea>
            </div>
          ) : (
            <EmptyState text="Paste a job post and click Generate — your cover letter will appear here" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getUser()
      .then(setUser)
      .catch(() => router.replace("/login"));
  }, [router]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  if (!user) return null;

  return (
    <Tabs defaultValue="checker" className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header with nav */}
      <header className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <span className="font-semibold text-sm sm:text-base whitespace-nowrap">
          Upwork Proposals
        </span>

        {/* Nav links — centre */}
        <TabsList className="hidden sm:flex">
          <TabsTrigger value="checker">Proposal Checker</TabsTrigger>
          <TabsTrigger value="generator">Proposal Generator</TabsTrigger>
        </TabsList>

        {/* User + logout */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden md:block">{user.name}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </header>

      {/* Mobile nav (shown below header on small screens) */}
      <div className="sm:hidden border-b bg-white px-4 py-2">
        <TabsList className="w-full">
          <TabsTrigger value="checker" className="flex-1">Checker</TabsTrigger>
          <TabsTrigger value="generator" className="flex-1">Generator</TabsTrigger>
        </TabsList>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-screen-2xl mx-auto w-full">
        <TabsContent value="checker" className="mt-0">
          <ProposalChecker />
        </TabsContent>
        <TabsContent value="generator" className="mt-0">
          <ProposalGenerator />
        </TabsContent>
      </main>
    </Tabs>
  );
}
