//src/components/pages/auth/me/Me.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store";
import {
  updateUser,
  logout as logoutAction,
} from "@/lib/features/auth/authSlice";
import {
  useUpdateAccountMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useLogoutMutation,
  useUploadAvatarMutation,
} from "@/lib/features/auth/authApiSlice";
import {
  updateSchema,
  changePasswordSchema,
} from "@/lib/features/auth/authSchema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CornerFlourish from "@/components/shared/CornerFlourish";
import {
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  LogOut,
  ShieldAlert,
  Upload,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AuthGuard from "@/components/shared/AuthGuard";

type UpdatingTarget =
  | "profile"
  | "upload-avatar"
  | "password"
  | "delete"
  | "logout"
  | null;

export default function Me() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const { user } = useSelector((state: RootState) => state.auth as any);

  const targetId = searchParams.get("id");
  const isEditingOther = !!targetId && user?.role === "super_admin";

  const [updateAccount, { isLoading: isUpdatingProfile }] =
    useUpdateAccountMutation();
  const [uploadAvatar, { isLoading: isUploadingAvatar }] =
    useUploadAvatarMutation();
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();
  const [deleteAccount, { isLoading: isDeleting }] = useDeleteAccountMutation();
  const [logoutApi] = useLogoutMutation();

  const [username, setUsername] = useState(user?.username || "");
  const [profileTitle, setProfileTitle] = useState(user?.profile_title || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [avatarInput, setAvatarInput] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [profileFormError, setProfileFormError] = useState("");
  const [passwordFormError, setPasswordFormError] = useState("");

  const [updatingTarget, setUpdatingTarget] = useState<UpdatingTarget>(null);

  const isAnyLoading =
    isUpdatingProfile ||
    isUploadingAvatar ||
    isChangingPassword ||
    isDeleting ||
    updatingTarget === "logout";

  useEffect(() => {
    if (user && !isEditingOther) {
      setUsername(user.username);
      setProfileTitle(user.profile_title || "");
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user, isEditingOther]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const errors: Record<string, string> = {};

      const profileVal = updateSchema.safeParse({
        username,
        profileTitle,
        avatarUrl,
      });

      if (!profileVal.success) {
        profileVal.error.issues.forEach((is) => {
          if (is.path[0]) errors[is.path[0].toString()] = is.message;
        });
      }

      if (newPassword || currentPassword) {
        const passVal = changePasswordSchema.safeParse({
          currentPassword: isEditingOther ? "ADMIN_OVERRIDE" : currentPassword,
          newPassword,
          confirmPassword,
        });
        if (!passVal.success) {
          passVal.error.issues.forEach((is) => {
            if (is.path[0]) errors[is.path[0].toString()] = is.message;
          });
        }
      }
      setFieldErrors(errors);
    }, 200);
    return () => clearTimeout(timer);
  }, [
    username,
    profileTitle,
    avatarUrl,
    currentPassword,
    newPassword,
    confirmPassword,
    isEditingOther,
  ]);

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setError("");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleLogout = async () => {
    setUpdatingTarget("logout");
    try {
      await logoutApi().unwrap();
    } catch {
      /* ignored */
    } finally {
      dispatch(logoutAction());
      router.push("/auth");
    }
  };

  const handleAddAvatarUrl = () => {
    if (avatarInput.trim()) {
      setAvatarUrl(avatarInput.trim());
      setAvatarInput("");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setProfileFormError("Image size must be less than 5MB.");
      return;
    }

    setProfileFormError("");
    setUpdatingTarget("upload-avatar");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadAvatar({
        id: targetId || undefined,
        formData,
      }).unwrap();

      setAvatarUrl(result.url);
      setAvatarInput("");
      flashSuccess(
        "Image uploaded to Cloudinary. Click 'Update Profile' to save.",
      );
    } catch (err: any) {
      setProfileFormError(
        err.data?.error || "Failed to upload image to server.",
      );
    } finally {
      setUpdatingTarget(null);
      e.target.value = "";
    }
  };

  const handleUpdateProfile = async () => {
    setProfileFormError("");
    const validation = updateSchema.safeParse({
      username,
      profileTitle,
      avatarUrl,
    });

    if (!validation.success) {
      setProfileFormError(
        validation.error.issues[0]?.message ||
          "Invalid input detected in form fields.",
      );
      return;
    }

    setUpdatingTarget("profile");
    try {
      const payload: any = {
        username,
        profileTitle,
        avatarUrl,
        id: targetId || undefined,
      };

      const result = await updateAccount(payload).unwrap();

      if (!isEditingOther) {
        dispatch(updateUser(result.user));
      }

      setAvatarUrl(result.user.avatar_url || "");
      flashSuccess(
        isEditingOther
          ? "User profile updated."
          : "Profile updated successfully.",
      );
    } catch (err: any) {
      if (err.status === 409 && err.data?.code === "USERNAME_TAKEN") {
        setProfileFormError(
          err.data?.error || "Username already taken. Pick a different one.",
        );
      } else if (err.status === "FETCH_ERROR" || err.status === undefined) {
        setProfileFormError(
          "Couldn't reach the server. Check your connection and try again.",
        );
      } else {
        setProfileFormError(
          err.data?.error ||
            "Failed to update profile. Server rejected the request.",
        );
      }
    } finally {
      setUpdatingTarget(null);
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordFormError("");

    const validation = changePasswordSchema.safeParse({
      currentPassword: isEditingOther ? "ADMIN_OVERRIDE" : currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      setPasswordFormError(
        validation.error.issues[0]?.message ||
          "Invalid input detected in password fields.",
      );
      return;
    }

    setUpdatingTarget("password");
    try {
      await changePassword({
        currentPassword: isEditingOther ? undefined : currentPassword,
        newPassword,
        confirmPassword,
        id: targetId || undefined,
      }).unwrap();

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      flashSuccess(
        isEditingOther
          ? "User password reset successful."
          : "Password changed successfully.",
      );
    } catch (err: any) {
      setPasswordFormError(
        err.data?.error ||
          "Password update failed. Server rejected the request.",
      );
    } finally {
      setUpdatingTarget(null);
    }
  };

  const handleDeleteUser = async () => {
    setUpdatingTarget("delete");
    try {
      await deleteAccount(targetId || undefined).unwrap();

      if (!isEditingOther) {
        dispatch(logoutAction());
        router.push("/auth");
      } else {
        flashSuccess("Target account purged successfully.");
        router.push("/admin/dashboard");
      }
    } catch {
      setError("Failed to delete user.");
    } finally {
      setUpdatingTarget(null);
    }
  };

  return (
    <AuthGuard
      message="Account terminal locked. Please provide credentials to access security and profile settings."
      level="critical"
    >
      <section className="p-3 lg:p-6 min-h-screen border-3 border-double flex flex-col gap-6">
        <div className="relative border-3 border-double p-3 flex flex-col gap-3">
          <CornerFlourish className="-top-1 -left-1" />
          <CornerFlourish className="-top-1 -right-1 rotate-90" />
          <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
          <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

          <div className="flex gap-1 items-center text-primary">
            <h1 className="bg-primary text-primary-foreground font-bold p-1 w-fit">
              {isEditingOther ? "Administrative Override" : "Manage Account"}
            </h1>
          </div>
          <div className="border-l-3 border-double pl-3">
            <p className=" font-bold">
              {isEditingOther
                ? `You are managing account ID: ${targetId}.`
                : "You are the only user. Update profile or manage security settings."}
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
            <p className="text-sm font-bold">{error || success}</p>
          </div>
        )}

        <div className="relative border-3 border-double p-3 flex flex-col gap-3">
          <CornerFlourish className="-top-1 -left-1" />
          <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

          <div className="flex gap-1 items-center text-primary">
            <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit ">
              {isEditingOther ? "Target User Details" : "Profile Details"}
            </h4>
          </div>

          <div className="border-l-3 border-double pl-3 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-primary flex items-center justify-between gap-1">
                <span className="flex items-center gap-1">
                  Avatar / Profile Picture
                </span>
                <span
                  className={cn(
                    "text-sm",
                    avatarInput.length > 2048
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {avatarInput.length}/2048
                </span>
              </label>

              <div className="flex gap-2">
                <Input
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddAvatarUrl();
                    }
                  }}
                  placeholder="Paste URL or click upload icon..."
                  maxLength={2048}
                  className="border-3 border-double rounded-none text-sm flex-1 disabled:opacity-50"
                  disabled={isAnyLoading}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAvatarUrl}
                  disabled={isAnyLoading || !avatarInput.trim()}
                  className="border-3 border-double rounded-none h-9 gap-1"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">Add</span>
                </Button>
                <div
                  className={cn(
                    "relative border-3 border-double px-3 flex items-center h-9 transition-colors",
                    isAnyLoading ||
                      (isUploadingAvatar && updatingTarget === "upload-avatar")
                      ? "bg-card opacity-40 cursor-not-allowed"
                      : "bg-card cursor-pointer hover:bg-card/80",
                  )}
                >
                  {isUploadingAvatar && updatingTarget === "upload-avatar" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-4 w-4 text-primary" />
                  )}
                  <input
                    type="file"
                    disabled={isAnyLoading}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    onChange={handleImageUpload}
                    accept="image/*"
                  />
                </div>
              </div>

              {fieldErrors.avatarUrl && (
                <p className="text-sm text-destructive font-bold mt-1">
                  {fieldErrors.avatarUrl}
                </p>
              )}

              {avatarUrl && (
                <div className="relative h-20 w-20 border-3 border-double group mt-2 bg-card overflow-hidden">
                  <img
                    src={avatarUrl}
                    alt="Avatar Preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    disabled={isAnyLoading}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 mt-2">
              <label className="text-sm font-bold text-primary flex justify-between items-center">
                <span>Display Title</span>
                <span
                  className={cn(
                    "text-sm",
                    profileTitle.length > 100
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {profileTitle.length}/100
                </span>
              </label>
              <Input
                value={profileTitle}
                onChange={(e) => setProfileTitle(e.target.value)}
                placeholder="e.g. Back End Dev"
                className="border-3 border-double rounded-none text-sm"
                disabled={isAnyLoading}
                autoComplete="off"
              />
              {fieldErrors.profileTitle && (
                <p className="text-sm text-destructive font-bold">
                  {fieldErrors.profileTitle}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-primary flex justify-between items-center">
                <span>Username</span>
                <span
                  className={cn(
                    "text-sm",
                    username.length > 20
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {username.length}/20
                </span>
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="protocols_farmer"
                className="border-3 border-double rounded-none text-sm"
                disabled={isAnyLoading}
                autoComplete="off"
              />
              {fieldErrors.username && (
                <p className="text-sm text-destructive font-bold">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <Button
              onClick={handleUpdateProfile}
              disabled={isAnyLoading}
              variant="outline"
              className="border-3 border-double rounded-none w-full sm:w-fit gap-1 mt-2"
            >
              <span>
                {isUpdatingProfile && updatingTarget === "profile"
                  ? "Saving..."
                  : isEditingOther
                    ? "Update Target Profile"
                    : "Update Profile"}
              </span>
            </Button>

            {profileFormError && (
              <div className="border-3 border-double border-destructive bg-destructive/10 p-3 mt-1">
                <p className="text-sm text-destructive font-bold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{profileFormError}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="relative border-3 border-double p-3 flex flex-col gap-3">
          <CornerFlourish className="-top-1 -left-1" />
          <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

          <div className="flex gap-1 items-center text-primary">
            <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit ">
              {isEditingOther ? "Reset Target Password" : "Change Password"}
            </h4>
          </div>

          <div className="border-l-3 border-double pl-3 flex flex-col gap-3">
            {!isEditingOther && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-primary">
                  Current Password
                </label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="border-3 border-double rounded-none text-sm pr-10"
                    disabled={isAnyLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/70 disabled:opacity-50"
                    tabIndex={-1}
                    disabled={isAnyLoading}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {fieldErrors.currentPassword && (
                  <p className="text-sm text-destructive font-bold">
                    {fieldErrors.currentPassword}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-primary flex justify-between items-center">
                <span>
                  {isEditingOther ? "New System Password" : "New Password"}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    newPassword.length > 50
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {newPassword.length}/50
                </span>
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="border-3 border-double rounded-none text-sm pr-10"
                  disabled={isAnyLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/70 disabled:opacity-50"
                  tabIndex={-1}
                  disabled={isAnyLoading}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.newPassword && (
                <p className="text-sm text-destructive font-bold">
                  {fieldErrors.newPassword}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-primary">
                Confirm New Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="border-3 border-double rounded-none text-sm"
                disabled={isAnyLoading}
                autoComplete="new-password"
              />
              {fieldErrors.confirmPassword && (
                <p className="text-sm text-destructive font-bold">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              onClick={handleUpdatePassword}
              disabled={isAnyLoading}
              className="border-3 border-double rounded-none w-full sm:w-fit gap-1 mt-2"
              variant="outline"
            >
              <span>
                {isChangingPassword && updatingTarget === "password"
                  ? "Updating..."
                  : isEditingOther
                    ? "Force Password Reset"
                    : "Change Password"}
              </span>
            </Button>

            {passwordFormError && (
              <div className="border-3 border-double border-destructive bg-destructive/10 p-3 mt-1">
                <p className="text-sm text-destructive font-bold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{passwordFormError}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="relative border-3 border-double border-destructive p-3 flex flex-col gap-3">
          <CornerFlourish className="-top-1 -left-1 text-destructive" />
          <CornerFlourish className="-top-1 -right-1 rotate-90 text-destructive" />
          <CornerFlourish className="-bottom-1 -left-1 -rotate-90 text-destructive" />
          <CornerFlourish className="-bottom-1 -right-1 rotate-180 text-destructive" />

          <div className="flex gap-1 items-center text-destructive">
            <h4 className=" font-bold p-1 w-fit ">Danger Zone</h4>
          </div>

          <div className="border-l-3 border-double border-destructive pl-3 flex flex-col gap-3">
            <p className="text-sm">
              {isEditingOther
                ? "Permanently purge this user account from the system."
                : "Permanently remove your identity or end the session."}
            </p>

            {!isEditingOther && (
              <Button
                onClick={handleLogout}
                variant="outline"
                disabled={isAnyLoading}
                className="border-3 border-double border-destructive text-destructive rounded-none w-full sm:w-fit gap-1 hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                <span>
                  {updatingTarget === "logout" ? "Logging out..." : "Logout"}
                </span>
              </Button>
            )}

            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                disabled={isAnyLoading}
                className="border-3 border-double border-destructive text-destructive rounded-none w-full sm:w-fit gap-1 hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>
                  {isEditingOther ? "Delete User Account" : "Delete My Account"}
                </span>
              </Button>
            ) : (
              <div className="flex flex-col gap-3 p-3 border-3 border-double border-destructive mt-2">
                <p className="text-sm font-bold text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Are you sure? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleDeleteUser}
                    disabled={isAnyLoading}
                    className="border-3 border-double rounded-none bg-destructive text-destructive-foreground gap-1 flex-1 disabled:opacity-50 hover:bg-destructive/80"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>
                      {isDeleting && updatingTarget === "delete"
                        ? "Deleting..."
                        : isEditingOther
                          ? "Delete User"
                          : "Delete Account"}
                    </span>
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    variant="outline"
                    disabled={isAnyLoading}
                    className="border-3 border-double rounded-none disabled:opacity-50 text-destructive border-destructive hover:bg-destructive/10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </AuthGuard>
  );
}
