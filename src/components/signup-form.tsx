"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { QueryLink } from "@/components/query-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { signUp } from "@/lib/auth-client";

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));

    if (password !== String(form.get("confirm-password"))) {
      setPasswordMismatch(true);
      return;
    }
    setPasswordMismatch(false);

    setPending(true);
    const { data, error } = await signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password,
    });

    if (error) {
      setPending(false);
      toast.error(error.message ?? "Something went wrong");
      return;
    }

    // During an OAuth (MCP) flow the auth client follows the returned redirect on its own.
    if ("redirect" in data && data.redirect) return;

    router.push("/");
    router.refresh();
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="m@example.com"
                required
              />
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <Field data-invalid={passwordMismatch || undefined}>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={passwordMismatch || undefined}
                required
              />
              <FieldDescription>Please confirm your password.</FieldDescription>
              {passwordMismatch && (
                <FieldError>Passwords do not match.</FieldError>
              )}
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending && <Spinner data-icon="inline-start" />}
                  Create Account
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account?{" "}
                  <QueryLink href="/login">Sign in</QueryLink>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
