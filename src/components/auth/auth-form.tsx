"use client";

import { type FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup" | "reset" | "update";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "");
    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
        toast.success("Welcome back.");
        router.push(searchParams.get("next") || "/dashboard");
        router.refresh();
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        if (error) {
          throw error;
        }
        toast.success("Check your inbox to confirm your account.");
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`
        });
        if (error) {
          throw error;
        }
        toast.success("Password reset link sent.");
      }

      if (mode === "update") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          throw error;
        }
        toast.success("Password updated.");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setPending(false);
    }
  }

  const copy = {
    login: {
      title: "Sign in",
      subtitle: "Access ambassador balances, linked sales, trips and credits.",
      button: "Enter dashboard"
    },
    signup: {
      title: "Create account",
      subtitle: "Start tracking IronGlass sales, expo credits and lens purchases.",
      button: "Create account"
    },
    reset: {
      title: "Reset password",
      subtitle: "Send a secure reset link to your inbox.",
      button: "Send reset link"
    },
    update: {
      title: "New password",
      subtitle: "Set a new password and return to the dashboard.",
      button: "Update password"
    }
  }[mode];

  return (
    <form onSubmit={onSubmit} className="glass-panel w-full max-w-md rounded-lg p-6">
      <div className="mb-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-iron-400/20 bg-iron-400/10 text-iron-300">
          {mode === "reset" ? <Mail size={22} /> : <ShieldCheck size={22} />}
        </div>
        <h1 className="text-3xl font-semibold text-white">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-white/58">{copy.subtitle}</p>
      </div>

      <div className="grid gap-4">
        {mode === "signup" ? (
          <Field label="Name">
            <Input name="fullName" autoComplete="name" placeholder="Timo Sasaki" />
          </Field>
        ) : null}

        {mode !== "update" ? (
          <Field label="Email">
            <Input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@ironglass.com"
            />
          </Field>
        ) : null}

        {mode !== "reset" ? (
          <Field label="Password">
            <Input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="Minimum 8 characters"
            />
          </Field>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          icon={<ArrowRight size={16} />}
          className="mt-2 w-full"
        >
          {pending ? "Working..." : copy.button}
        </Button>
      </div>
    </form>
  );
}
