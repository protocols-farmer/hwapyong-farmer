//src/components/pages/auth/auth/Authentication.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CornerFlourish from "@/components/shared/CornerFlourish";
import Logo from "@/components/shared/Logo";
import {
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertTriangle,
  Check,
  ArrowRight,
} from "lucide-react";

import { useDispatch } from "react-redux";
import {
  useLoginMutation,
  useSignupMutation,
  useLazyBanCheckQuery,
} from "@/lib/features/auth/authApiSlice";
import { setCredentials } from "@/lib/features/auth/authSlice";
import { loginSchema, signupSchema } from "@/lib/features/auth/authSchema";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export default function Authentication() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [mode, setMode] = useState<Mode>("login");

  const [loginTrigger, { isLoading: isLoggingIn }] = useLoginMutation();
  const [signupTrigger, { isLoading: isSigningUp }] = useSignupMutation();
  const [triggerBanCheck] = useLazyBanCheckQuery();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  const isLogin = mode === "login";
  const isSubmitting = isLoggingIn || isSigningUp;

  useEffect(() => {
    const timer = setTimeout(() => {
      const schema = isLogin ? loginSchema : signupSchema;
      const data = {
        username,
        password,
        ...(isLogin ? {} : { confirmPassword }),
      };
      const validation = schema.safeParse(data);

      const errors: Record<string, string> = {};
      if (!validation.success) {
        validation.error.issues.forEach((is) => {
          if (is.path[0]) errors[is.path[0].toString()] = is.message;
        });
      }
      setFieldErrors(errors);
    }, 200);
    return () => clearTimeout(timer);
  }, [username, password, confirmPassword, isLogin]);

  useEffect(() => {
    if (!isLogin) {
      setLockoutSeconds(0);
      return;
    }

    const checkBanStatus = async () => {
      try {
        const res = await triggerBanCheck().unwrap();
        if (res.banned && res.remainingSeconds > 0) {
          setLockoutSeconds(res.remainingSeconds);
          setError("Too many failed attempts. Locked out.");
        }
      } catch (e) {
        console.error("Failed to run background security check.");
      }
    };

    checkBanStatus();
  }, [isLogin, triggerBanCheck]);

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

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setFieldErrors({});
  };

  const toggleMode = () => {
    setMode(isLogin ? "signup" : "login");
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const schema = isLogin ? loginSchema : signupSchema;
    const validation = schema.safeParse({
      username,
      password,
      ...(isLogin ? {} : { confirmPassword }),
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Validation failed.");
      return;
    }

    try {
      if (isLogin) {
        const result = await loginTrigger({ username, password }).unwrap();

        dispatch(setCredentials(result));
        setSuccess("Accessing protocols...");
        setTimeout(() => router.push("/me"), 800);
      } else {
        const result = await signupTrigger({
          username,
          password,
          confirmPassword,
        }).unwrap();

        dispatch(setCredentials(result));
        setSuccess("Auto-logging in...");
        setTimeout(() => router.push("/me"), 1200);
      }
    } catch (err: any) {
      if (err.data?.remainingSeconds) {
        setLockoutSeconds(err.data.remainingSeconds);
        setError("Too many attempts. Locked out.");
      } else if (
        err.status === 409 &&
        err.data?.code === "USERNAME_TAKEN" &&
        err.data?.field === "username"
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          username: err.data?.error || "Username already taken.",
        }));
      } else if (err.status === "FETCH_ERROR" || err.status === undefined) {
        setError(
          "Couldn't reach the server. Check your connection and try again.",
        );
      } else {
        setError(err.data?.error || "Authentication failed.");
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
                {isLogin ? "Login" : "Sign Up"}
              </h1>
            </div>
            <div className="border-l-3 border-double pl-3">
              <p className="text-sm font-bold">
                {isLogin
                  ? "Welcome back. Enter your credentials."
                  : "Create your account. You're one of one."}
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
                {isLogin &&
                  lockoutSeconds > 0 &&
                  ` Try again in ${Math.floor(lockoutSeconds / 60)}m ${lockoutSeconds % 60}s.`}
                {success}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-primary flex items-center gap-1">
                Username
              </label>
              <Input
                type="text"
                value={username}
                disabled={isSubmitting || (isLogin && lockoutSeconds > 0)}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="protocols_farmer"
                autoComplete="username"
                className="border-3 border-double rounded-none text-xs"
              />
              {fieldErrors.username && (
                <p className="text-xs text-destructive font-bold">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-primary flex items-center gap-1">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  disabled={isSubmitting || (isLogin && lockoutSeconds > 0)}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "Enter password" : "Min. 6 characters"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="border-3 border-double rounded-none text-xs pr-10"
                />
                <button
                  type="button"
                  disabled={isSubmitting || (isLogin && lockoutSeconds > 0)}
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

            {!isLogin && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-primary flex items-center gap-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    disabled={isSubmitting}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    className="border-3 border-double rounded-none text-xs pr-10"
                  />
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/70"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-xs text-destructive font-bold">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || (isLogin && lockoutSeconds > 0)}
              className="border-3 border-double rounded-none w-full gap-1 mt-2"
            >
              {isLogin ? (
                <LogIn className="h-4 w-4" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              <span>
                {isSubmitting
                  ? "Processing..."
                  : isLogin
                    ? "Login"
                    : "Create Account"}
              </span>
            </Button>
          </form>

          <div className="border-t-3 border-double pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={toggleMode}
              className="border-3 border-double rounded-none w-full gap-1"
            >
              <ArrowRight className="h-4 w-4" />
              <span>{isLogin ? "Create Account" : "Back to Login"}</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
