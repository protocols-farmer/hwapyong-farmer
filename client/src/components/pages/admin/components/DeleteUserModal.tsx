//src/components/pages/admin/components/DeleteUserModal.tsx
"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import CornerFlourish from "@/components/shared/CornerFlourish";
import { Button } from "@/components/ui/button";
import { useDeleteUserMutation } from "@/lib/features/admin/adminApiSlice";

interface Props {
  targetUser: { id: string; username: string };
  onClose: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export default function DeleteUserModal({
  targetUser,
  onClose,
  showToast,
}: Props) {
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const handleDeleteUser = async () => {
    try {
      await deleteUser(targetUser.id).unwrap();
      showToast("User deleted successfully.", "success");
      onClose();
    } catch (err) {
      showToast("Deletion failed.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <div className="relative border-3 border-double border-destructive bg-background p-6 flex flex-col gap-4 max-w-sm w-full animate-in zoom-in-95">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

        <h3 className="font-bold text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Confirm Deletion
        </h3>
        <p className="text-sm font-bold">
          You are about to permanently delete the account for{" "}
          <span className="text-primary">"{targetUser.username}"</span>.
        </p>
        <div className="flex justify-end gap-3 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="border-3 border-double rounded-none text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteUser}
            disabled={isDeleting}
            className="border-3 border-double bg-destructive text-destructive-foreground rounded-none text-xs gap-1"
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
