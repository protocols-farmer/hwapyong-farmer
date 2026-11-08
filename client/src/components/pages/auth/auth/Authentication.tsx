//src/components/pages/auth/auth/Authentication.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CornerFlourish } from "@/components/shared/flourishes/CornerFlourish";
import Logo from "@/components/shared/Logo";
import { Eye, EyeOff, LogIn, AlertTriangle, Check } from "lucide-react";

import { useDispatch, useSelector } from "react-redux";
import { useLoginMutation } from "@/lib/features/auth/authApiSlice";
import {
  setCredentials,
  selectIsAuthenticated,
  selectIsHydrated,
} from "@/lib/features/auth/authSlice";
import { loginSchema } from "@/lib/features/auth/authSchema";
import { cn } from "@/lib/utils";

export default function Authentication() {
  const router = useRouter();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isHydrated = useSelector(selectIsHydrated);

  const [loginTrigger, { isLoading: isLoggingIn }] = useLoginMutation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/me");
    }
  }, [isHydrated, isAuthenticated, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const validation = loginSchema.safeParse({ username, password });

      const errors: Record<string, string> = {};
      if (!validation.success) {
        validation.error.issues.forEach((is) => {
          if (is.path[0]) errors[is.path[0].toString()] = is.message;
        });
      }
      setFieldErrors(errors);
    }, 200);
    return () => clearTimeout(timer);
  }, [username, password]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;

    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validation = loginSchema.safeParse({ username, password });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Validation failed.");
      return;
    }

    try {
      const result = await loginTrigger({
        username: validation.data.username,
        password: validation.data.password,
      }).unwrap();

      dispatch(setCredentials(result));
      setSuccess("Accessing protocols...");
      router.push("/me");
    } catch (err: any) {
      console.error("[Authentication.handleSubmit] Login failed", err);
      if (err?.data?.remainingSeconds) {
        setLockoutSeconds(err.data.remainingSeconds);
        setError("Too many attempts. Locked out.");
      } else if (err?.status === "FETCH_ERROR" || err?.status === undefined) {
        setError(
          "Couldn't reach the server. Check your connection and try again.",
        );
      } else {
        setError(err?.data?.error || "Authentication failed.");
      }
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center p-3 lg:p-6">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="relative border-3 border-double p-3 lg:p-6 flex flex-col gap-6">
          <CornerFlourish className="-top-1 -left-1" />
          <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

          <div className="flex flex-col gap-3">
            <div className="flex gap-1 items-center text-primary">
              <h1 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
                Login :
              </h1>
            </div>
            <div className="border-l-3 border-double pl-3">
              <p className="text-sm font-bold">
                Welcome back. Enter your credentials.
              </p>
            </div>
          </div>

          {(error || success) && (
            <div
              className={cn(
                "border-3 border-double p-3 flex items-center gap-2",
                error
                  ? "border-destructive bg-destructive/10"
                  : "border-primary bg-primary/10",
              )}
            >
              {error ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <Check className="h-4 w-4 text-primary" />
              )}
              <p className="text-xs font-bold">
                {error}
                {lockoutSeconds > 0 &&
                  ` Try again in ${Math.floor(lockoutSeconds / 60)}m ${lockoutSeconds % 60}s.`}
                {success}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-primary flex items-center justify-between gap-1">
                <span>Username</span>
                <span
                  className={cn(
                    username.trim().length > 0 &&
                      (username.trim().length < 3 ||
                        username.trim().length > 20)
                      ? "text-destructive"
                      : "",
                  )}
                >
                  ({username.length}/20)
                </span>
              </label>
              <Input
                type="text"
                value={username}
                disabled={isLoggingIn || lockoutSeconds > 0}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
                maxLength={20}
                className="border-3 border-double rounded-none text-xs"
              />
              {fieldErrors.username && (
                <p className="text-xs text-destructive font-bold">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-primary flex items-center justify-between gap-1">
                <span>Password</span>
                <span
                  className={cn(
                    password.length > 0 &&
                      (password.length < 6 || password.length > 50)
                      ? "text-destructive"
                      : "",
                  )}
                >
                  ({password.length}/50)
                </span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  disabled={isLoggingIn || lockoutSeconds > 0}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  maxLength={50}
                  className="border-3 border-double rounded-none text-xs pr-10"
                />
                <button
                  type="button"
                  disabled={isLoggingIn || lockoutSeconds > 0}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/70"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-destructive font-bold">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoggingIn || lockoutSeconds > 0}
              className="border-3 border-double rounded-none w-full gap-1 mt-2"
            >
              <LogIn className="h-4 w-4" />
              <span>{isLoggingIn ? "Processing..." : "Login"}</span>
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
