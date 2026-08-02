//src/components/pages/admin/components/RevokeSessionsModal.tsx
"use client";

import React from "react";
import { PowerOff } from "lucide-react";
import CornerFlourish from "@/components/shared/CornerFlourish";
import { Button } from "@/components/ui/button";
import { useRevokeSessionsMutation } from "@/lib/features/admin/adminApiSlice";

interface Props {
  targetUser: { id: string; username: string };
  onClose: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export default function RevokeSessionsModal({
  targetUser,
  onClose,
  showToast,
}: Props) {
  const [revokeSessions, { isLoading: isRevoking }] =
    useRevokeSessionsMutation();

  const handleRevokeSessions = async () => {
    try {
      const result = await revokeSessions(targetUser.id).unwrap();
      showToast(result.message, "success");
      onClose();
    } catch (err) {
      showToast("Failed to revoke sessions.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div className="relative border-3 border-double border-primary bg-background p-6 flex flex-col gap-4 max-w-sm w-full animate-in zoom-in-95">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h3 className="font-bold text-primary flex items-center gap-2">
          <PowerOff className="h-5 w-5" />
          Terminate Sessions
        </h3>
        <p className="text-sm font-bold">
          CRITICAL WARNING: This will instantly wipe all active authentication
          tokens for{" "}
          <span className="text-primary">"{targetUser.username}"</span>.
        </p>
        <p className="text-xs opacity-80 font-bold">
          They will be forcefully logged out and kicked to the login screen as
          soon as their browser attempts its next background network request.
        </p>
        <div className="flex justify-end gap-3 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRevoking}
            className="border-3 border-double rounded-none text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRevokeSessions}
            disabled={isRevoking}
            className="border-3 border-double bg-primary text-primary-foreground hover:bg-primary/80 rounded-none text-xs gap-1"
          >
            {isRevoking ? "Terminating..." : "Terminate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
