"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Suspense } from "react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z
  .object({
    new_password: z
      .string({ required_error: "Password is required" })
      .min(8, "Password must be at least 8 characters"),
    confirm_password: z
      .string({ required_error: "Please confirm your password" }),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  async function onSubmit(values: FormData) {
    if (!token) {
      toast.error("Invalid reset link. Please request a new one.");
      return;
    }
    try {
      await api.post("/reset-password", {
        token,
        new_password: values.new_password,
      });
      toast.success("Password reset! Please sign in.");
      router.replace("/login");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Reset failed. The link may have expired.";
      toast.error(message);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>
              This reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password">
              <Button className="w-full">Request a new link</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set new password</CardTitle>
          <CardDescription>Choose a strong password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="••••••••"
                {...register("new_password")}
              />
              {errors.new_password && (
                <p className="text-xs text-red-500">{errors.new_password.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm_password">Confirm password</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="••••••••"
                {...register("confirm_password")}
              />
              {errors.confirm_password && (
                <p className="text-xs text-red-500">{errors.confirm_password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Reset password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
