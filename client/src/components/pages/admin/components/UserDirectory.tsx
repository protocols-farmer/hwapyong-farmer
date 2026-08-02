//src/components/pages/admin/components/UserDirectory.tsx
"use client";

import React, { useState } from "react";
import { User as UserIcon, Trash2, Loader2, PowerOff } from "lucide-react";
import { cn } from "@/lib/utils";
import CornerFlourish from "@/components/shared/CornerFlourish";
import {
  useGetUsersQuery,
  useUpdateUserRoleMutation,
} from "@/lib/features/admin/adminApiSlice";
import type { UserRole } from "@/lib/features/auth/authTypes";
import DeleteUserModal from "./DeleteUserModal";
import RevokeSessionsModal from "./RevokeSessionsModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Props {
  currentUserId: string;
  showToast: (message: string, type: "success" | "error") => void;
}

export default function UserDirectory({ currentUserId, showToast }: Props) {
  // MODIFIED: Destructured isError
  const { data, isLoading, isError } = useGetUsersQuery();
  const [updateRole] = useUpdateUserRoleMutation();

  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeTargetUser, setRevokeTargetUser] = useState<{
    id: string;
    username: string;
  } | null>(null);

  const [targetUser, setTargetUser] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingUserId(userId);
    try {
      await updateRole({ targetUserId: userId, newRole }).unwrap();
      showToast("Role updated successfully.", "success");
    } catch (err) {
      showToast("Role update failed.", "error");
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <>
      <div className="relative border-3 border-double p-3 flex flex-col gap-3 overflow-hidden">
        <CornerFlourish className="-top-1 -left-1" />
        <CornerFlourish className="-top-1 -right-1 rotate-90" />
        <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
        <CornerFlourish className="-bottom-1 -right-1 rotate-180" />
        <div className="flex gap-3 items-center border-b-3 border-double pb-3 ">
          <h4 className="text-sm font-bold text-primary">User Directory</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-3 border-double text-xs font-bold text-primary">
                <th className="p-3">Username</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    className="animate-pulse border-b-3 border-double"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 border-3 border-double bg-primary/10" />
                        <div className="flex flex-col gap-1">
                          <div className="h-3 w-20 bg-primary/20" />
                          <div className="h-2 w-32 bg-primary/10" />
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="h-8 w-32 bg-primary/10 border-3 border-double" />
                    </td>
                    <td className="p-3 text-right">
                      <div className="h-8 w-16 bg-primary/10 border-3 border-double ml-auto" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td
                    colSpan={3}
                    className="p-6 text-center text-destructive font-bold border-b-3 border-double bg-destructive/10"
                  >
                    SYSTEM ERROR: Failed to fetch directory data. Check backend
                    terminal for raw logs.
                  </td>
                </tr>
              ) : !data?.users || data.users.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="p-6 text-center opacity-50 font-bold border-b-3 border-double"
                  >
                    No users found in directory.
                  </td>
                </tr>
              ) : (
                data.users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isSuperAdmin = u.role === "super_admin";
                  const isActionsDisabled = isSelf || isSuperAdmin;

                  const isCurrentlyUpdatingRole = updatingUserId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="border-b-3 border-double hover:bg-card/50 transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="border-3 border-double p-1 bg-background">
                            <UserIcon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold">
                              {u.username}
                              {isSelf && (
                                <span className="ml-2 text-xs bg-primary text-primary-foreground px-1 py-0.5 ">
                                  You
                                </span>
                              )}
                            </span>
                            <span className="text-xs opacity-60">{u.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-3 h-8 w-32">
                          {isCurrentlyUpdatingRole ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-primary">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Updating...</span>
                            </div>
                          ) : (
                            <Select
                              disabled={isActionsDisabled}
                              value={u.role}
                              onValueChange={(val) =>
                                handleRoleChange(u.id, val as UserRole)
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  "w-32 h-8 border-3 border-double rounded-none bg-background text-xs font-bold focus:ring-0 focus:ring-offset-0",
                                  isSuperAdmin
                                    ? "text-primary border-primary"
                                    : "",
                                )}
                              >
                                <SelectValue placeholder="Select Role" />
                              </SelectTrigger>
                              <SelectContent className="border-3 border-double rounded-none bg-background text-xs font-bold">
                                <SelectItem
                                  value="user"
                                  className="focus:bg-primary focus:text-primary-foreground rounded-none"
                                >
                                  User
                                </SelectItem>
                                <SelectItem
                                  value="admin"
                                  className="focus:bg-primary focus:text-primary-foreground rounded-none"
                                >
                                  Admin
                                </SelectItem>
                                <SelectItem
                                  value="super_admin"
                                  className="focus:bg-primary focus:text-primary-foreground rounded-none"
                                >
                                  Super Admin
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            disabled={
                              isActionsDisabled || isCurrentlyUpdatingRole
                            }
                            onClick={() => {
                              setRevokeTargetUser({
                                id: u.id,
                                username: u.username,
                              });
                              setShowRevokeModal(true);
                            }}
                            title="Force Terminate All Sessions"
                            className={cn(
                              "border-3 border-double border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none h-8 w-8 p-0",
                              isActionsDisabled &&
                                "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-primary",
                            )}
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            disabled={
                              isActionsDisabled || isCurrentlyUpdatingRole
                            }
                            onClick={() => {
                              setTargetUser({
                                id: u.id,
                                username: u.username,
                              });
                              setShowDeleteModal(true);
                            }}
                            className={cn(
                              "border-3 border-double border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground inline-flex items-center justify-center rounded-none h-8 w-8 p-0",
                              isActionsDisabled &&
                                "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-destructive",
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDeleteModal && targetUser && (
        <DeleteUserModal
          targetUser={targetUser}
          onClose={() => {
            setShowDeleteModal(false);
            setTargetUser(null);
          }}
          showToast={showToast}
        />
      )}

      {showRevokeModal && revokeTargetUser && (
        <RevokeSessionsModal
          targetUser={revokeTargetUser}
          onClose={() => {
            setShowRevokeModal(false);
            setRevokeTargetUser(null);
          }}
          showToast={showToast}
        />
      )}
    </>
  );
}
