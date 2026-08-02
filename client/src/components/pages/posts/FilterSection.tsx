//src/components/pages/posts/FilterSection.tsx
"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import CornerFlourish from "@/components/shared/CornerFlourish";

interface FilterSectionProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  allAvailableTags: string[];
  selectedCategory?: string;
  setSelectedCategory?: (value: string) => void;
  allCategories?: string[];
  showCategoryFilter?: boolean;
  showSubcategoryFilter?: boolean;
  selectedSubcategory?: string;
  setSelectedSubcategory?: (value: string) => void;
  sortBy?: "date" | "title";
  setSortBy?: (value: "date" | "title") => void;
  sortOrder?: "ASC" | "DESC";
  setSortOrder?: (value: "ASC" | "DESC") => void;
  clearAllFilters?: () => void;
  isTagsLoading?: boolean; // <-- NEW
  isTagsError?: boolean; // <-- NEW
}

export default function FilterSection({
  searchQuery,
  setSearchQuery,
  selectedTags,
  toggleTag,
  allAvailableTags,
  selectedCategory = "",
  setSelectedCategory,
  allCategories = [],
  showCategoryFilter = false,
  showSubcategoryFilter = false,
  selectedSubcategory = "",
  setSelectedSubcategory,
  sortBy = "date",
  setSortBy,
  sortOrder = "DESC",
  setSortOrder,
  clearAllFilters,
  isTagsLoading, // <-- NEW
  isTagsError, // <-- NEW
}: FilterSectionProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch === searchQuery) return;
      setSearchQuery(localSearch);
    }, 400);
    return () => clearTimeout(handler);
  }, [localSearch, setSearchQuery, searchQuery]);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const hasActiveFilters =
    searchQuery ||
    selectedTags.length > 0 ||
    selectedCategory ||
    selectedSubcategory ||
    sortBy !== "date" ||
    sortOrder !== "DESC";

  const clearAll = () => {
    setLocalSearch("");
    if (clearAllFilters) {
      clearAllFilters();
    } else {
      setSearchQuery("");
      if (setSelectedCategory) setSelectedCategory("");
      if (setSelectedSubcategory) setSelectedSubcategory("");
      if (setSortBy) setSortBy("date");
      if (setSortOrder) setSortOrder("DESC");
    }
  };

  return (
    <div className="relative border-3 border-double p-3 flex flex-col gap-3">
      <CornerFlourish className="-top-1 -left-1" />
      <CornerFlourish className="-top-1 -right-1 rotate-90" />
      <CornerFlourish className="-bottom-1 -left-1 -rotate-90" />
      <CornerFlourish className="-bottom-1 -right-1 rotate-180" />

      <div className="flex justify-between items-center">
        <h4 className="bg-primary text-primary-foreground font-bold p-1 w-fit text-sm">
          Filters :
        </h4>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs font-bold border-3 border-double p-1 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="border-l-3 border-double pl-3 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-primary">Sort by :</label>
          <div className="flex flex-wrap gap-2">
            {["date", "title"].map((b) => (
              <button
                key={b}
                onClick={() => setSortBy?.(b as "date" | "title")}
                className={cn(
                  "border-3 border-double p-1 text-xs font-bold transition-all capitalize",
                  sortBy === b
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:border-primary",
                )}
              >
                {b}
              </button>
            ))}
            <div className=" bg-primary self-center" />
            {["ASC", "DESC"].map((o) => (
              <button
                key={o}
                onClick={() => setSortOrder?.(o as "ASC" | "DESC")}
                className={cn(
                  "border-3 border-double p-1 text-xs font-bold transition-all",
                  sortOrder === o
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:border-primary",
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {showCategoryFilter && allCategories.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-primary">
              Filter by room :
            </label>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() =>
                    setSelectedCategory?.(selectedCategory === cat ? "" : cat)
                  }
                  className={cn(
                    "border-3 border-double p-1 text-xs font-bold transition-all capitalize",
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:border-primary",
                  )}
                >
                  {cat.replace("-", " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        {showSubcategoryFilter && selectedCategory === "projects" && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-primary">
              Project type :
            </label>
            <div className="flex flex-wrap gap-2">
              {["serious", "random"].map((sub) => (
                <button
                  key={sub}
                  onClick={() =>
                    setSelectedSubcategory?.(
                      selectedSubcategory === sub ? "" : sub,
                    )
                  }
                  className={cn(
                    "border-3 border-double p-1 text-xs font-bold transition-all capitalize",
                    selectedSubcategory === sub
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:border-primary",
                  )}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-primary">
            Search words :
          </label>
          <input
            type="text"
            placeholder="Search something..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-background border-3 border-double p-2 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-primary">
            Filter by tags :
          </label>
          <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto p-1 border-3 border-double scrollbar-thin scrollbar-thumb-primary">
            {isTagsError ? (
              <p className="text-xs font-bold text-destructive">
                Error loading tags.
              </p>
            ) : isTagsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="border-3 border-double bg-primary/10 animate-pulse h-[26px] w-16"
                />
              ))
            ) : allAvailableTags.length > 0 ? (
              allAvailableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "border-3 border-double p-1 text-xs font-bold transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:border-primary",
                    )}
                  >
                    #{tag}
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No tags available.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
