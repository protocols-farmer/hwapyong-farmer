//src/components/pages/admin/components/SystemLogs.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Terminal,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import CornerFlourish from "@/components/shared/CornerFlourish";
import { Button } from "@/components/ui/button";
import { useGetAuditLogsQuery } from "@/lib/features/admin/adminApiSlice";

export default function SystemLogs() {
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState<string | void>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError } = useGetAuditLogsQuery({
    query: activeSearch || undefined,
    page: page,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const newSearch = searchInput.trim() || undefined;

      if (newSearch !== activeSearch) {
        setPage(1);
        setActiveSearch(newSearch);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput, activeSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim() || undefined);
  };

  return (
    <div className="relative border-3 border-double p-4 flex flex-col gap-3 bg-card/10">
      <CornerFlourish className="-top-1 -left-1" />
      <CornerFlourish className="-top-1 -right-1 rotate-90" />
      <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
      <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex  items-center text-primary border-b-3 border-double pb-3 w-full">
          <h4 className="font-bold text-sm  ">Logs :</h4>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Live search action or admin..."
            className="flex-1 md:w-64 bg-background border-3 border-double p-2 text-xs font-bold focus:border-primary outline-none transition-colors"
          />
          <Button
            type="submit"
            disabled={isFetching}
            className="border-3 border-double rounded-none h-auto p-2"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto border-3 border-double bg-background">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-3 border-double text-xs   text-primary bg-primary/5">
              <th className="p-3">Timestamp</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Action</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody className="text-xs font-mono">
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-primary animate-pulse font-sans font-bold"
                >
                  Loading system logs...
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-destructive font-bold border-b-3 border-double bg-destructive/10 font-sans"
                >
                  SYSTEM ERROR: Failed to fetch audit logs. Check backend
                  terminal for raw logs.
                </td>
              </tr>
            ) : !data?.logs || data.logs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center opacity-50 font-sans"
                >
                  No logs found.
                </td>
              </tr>
            ) : (
              data.logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b-3 border-double hover:bg-card/50 transition-colors"
                >
                  <td className="p-3 opacity-70 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-bold text-primary">
                    {log.admin_username}
                  </td>
                  <td className="p-3 font-bold">{log.action}</td>
                  <td className="p-3 opacity-80 min-w-[200px]">
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t-3 border-double pt-4 mt-2">
          <p className="text-xs font-bold opacity-70">
            Showing Page {data.page} of {data.totalPages} ({data.total} total
            logs)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-3 border-double rounded-none h-8 text-xs px-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <Button
              variant="outline"
              disabled={page === data.totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="border-3 border-double rounded-none h-8 text-xs px-2"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
