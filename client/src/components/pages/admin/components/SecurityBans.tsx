//src/components/pages/admin/components/SecurityBans.tsx
"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Unlock, Loader2, RefreshCw } from "lucide-react";
import CornerFlourish from "@/components/shared/CornerFlourish";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useGetBansQuery,
  useLiftBanMutation,
} from "@/lib/features/admin/adminApiSlice";

interface Props {
  showToast: (message: string, type: "success" | "error") => void;
}

export default function SecurityBans({ showToast }: Props) {
  const { data, isLoading, isFetching, refetch, isError } = useGetBansQuery(
    undefined,
    {
      pollingInterval: 15000,
    },
  );

  const [liftBan] = useLiftBanMutation();
  const [liftingKey, setLiftingKey] = useState<string | null>(null);

  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [expirations, setExpirations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (data?.bans) {
      const newExpirations: Record<string, number> = {};
      const currentNow = Math.floor(Date.now() / 1000);
      data.bans.forEach((ban) => {
        newExpirations[ban.key] = currentNow + ban.remainingSeconds;
      });
      setExpirations(newExpirations);
    }
  }, [data]);

  useEffect(() => {
    const timer = setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  const handleLiftBan = async (key: string) => {
    setLiftingKey(key);
    try {
      await liftBan(key).unwrap();
      showToast("Security ban successfully lifted.", "success");
    } catch {
      showToast("Failed to lift ban.", "error");
    } finally {
      setLiftingKey(null);
    }
  };

  return (
    <div className="relative border-3 border-double p-4 flex flex-col gap-3 bg-destructive/5">
      <CornerFlourish className="-top-1 -left-1 text-destructive" />
      <CornerFlourish className="-top-1 -right-1 rotate-90 text-destructive" />
      <CornerFlourish className="-bottom-1 -left-1 -rotate-90 text-destructive" />
      <CornerFlourish className="-bottom-1 -right-1 rotate-180 text-destructive" />

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b-3 border-destructive border-double pb-3">
        <div className="flex gap-1 items-center text-destructive">
          <h4 className="font-bold text-sm">Active Security Bans (Redis)</h4>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-3 border-double border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-none h-8 px-3 text-xs gap-2"
        >
          <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
          Sync
        </Button>
      </div>

      <div className="overflow-x-auto border-3 border-double border-destructive/30 bg-background">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-3 border-double border-destructive/30 text-xs text-destructive bg-destructive/10">
              <th className="p-3">Type</th>
              <th className="p-3">Target</th>
              <th className="p-3">Time Remaining</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs font-mono">
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-destructive animate-pulse font-sans font-bold"
                >
                  Scanning Redis clusters...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-destructive font-bold border-b-3 border-double bg-destructive/20 font-sans"
                >
                  SYSTEM ERROR: Failed to fetch security bans. Check backend
                  terminal for raw logs.
                </td>
              </tr>
            ) : !data?.bans || data.bans.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center opacity-50 font-sans font-bold text-foreground"
                >
                  No active bans detected in system.
                </td>
              </tr>
            ) : (
              data.bans.map((ban) => {
                const isLifting = liftingKey === ban.key;
                const expirationTime =
                  expirations[ban.key] || now + ban.remainingSeconds;
                const secondsLeft = Math.max(0, expirationTime - now);

                return (
                  <tr
                    key={ban.key}
                    className="border-b-3 border-double border-destructive/30 hover:bg-destructive/10 transition-colors text-foreground"
                  >
                    <td className="p-3 font-bold">
                      <span
                        className={cn(
                          "px-2 py-0.5 border-2 border-double",
                          ban.type === "IP"
                            ? "border-primary text-primary"
                            : "border-destructive text-destructive",
                        )}
                      >
                        {ban.type}
                      </span>
                    </td>
                    <td className="p-3 font-bold opacity-90">{ban.target}</td>
                    <td className="p-3 opacity-80 font-bold">{secondsLeft}s</td>
                    <td className="p-3 text-right">
                      <Button
                        disabled={isLifting || secondsLeft === 0}
                        onClick={() => handleLiftBan(ban.key)}
                        variant="outline"
                        className="border-3 border-double border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none h-7 text-[10px] px-2 gap-1"
                      >
                        {isLifting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Unlock className="h-3 w-3" />
                        )}
                        Lift Ban
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
