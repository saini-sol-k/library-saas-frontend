"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Lock, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { messageFor } from "@/lib/api-error";
import { authService } from "@/services/tenant";

const schema = z.object({
  identifier: z.string().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await authService.login(values.identifier, values.password);
      // Full navigation so the server layout re-reads the new session cookie.
      const next = params.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (error) {
      setFormError(messageFor(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-sm text-danger-700"
        >
          {formError}
        </div>
      ) : null}

      <Field label="Username or email" htmlFor="identifier" required error={errors.identifier?.message}>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink4" aria-hidden />
          <Input
            id="identifier"
            autoComplete="username"
            autoFocus
            className="pl-9"
            invalid={Boolean(errors.identifier)}
            {...register("identifier")}
          />
        </div>
      </Field>

      <Field label="Password" htmlFor="password" required error={errors.password?.message}>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink4" aria-hidden />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="pl-9"
            invalid={Boolean(errors.password)}
            {...register("password")}
          />
        </div>
      </Field>

      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
            <BookOpen className="h-7 w-7 text-white" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">A.K. LIBRARY</h1>
          <p className="mt-1 text-[13px] text-white/55">Study • Focus • Achieve</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-ink">Sign in</h2>
          <p className="mt-1 mb-5 text-sm text-ink3">
            Use the account provided by your library administrator.
          </p>
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-5 text-center text-[12px] text-white/40">
          © {new Date().getFullYear()} A.K. Library Management System
        </p>
      </div>
    </div>
  );
}
