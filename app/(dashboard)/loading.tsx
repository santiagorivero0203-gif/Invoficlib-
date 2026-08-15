'use client'

import React from 'react'

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse p-1">
      {/* 1. Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-xl bg-muted/60" />
        <div className="h-4 w-72 rounded-xl bg-muted/40" />
      </div>

      {/* 2. Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-border bg-card/50 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded-md bg-muted/50" />
              <div className="h-4 w-4 rounded bg-muted/50" />
            </div>
            <div className="h-7 w-16 rounded-lg bg-muted/70" />
            <div className="h-3 w-32 rounded-md bg-muted/40" />
          </div>
        ))}
      </div>

      {/* 3. Action / Search Bar Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-11 w-full sm:max-w-md rounded-xl bg-card border border-border" />
        <div className="h-9 w-24 rounded-lg bg-muted/60" />
      </div>

      {/* 4. Table / Content List Skeleton */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/20 p-4 flex gap-4">
          <div className="h-4 w-24 rounded bg-muted/50" />
          <div className="h-4 flex-1 rounded bg-muted/40" />
          <div className="h-4 w-16 rounded bg-muted/50" />
          <div className="h-4 w-20 rounded bg-muted/50" />
        </div>
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-border/40 last:border-0">
              <div className="h-8 w-20 rounded-lg bg-muted/50" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-48 rounded bg-muted/60" />
                <div className="h-3 w-32 rounded bg-muted/40" />
              </div>
              <div className="h-4 w-16 rounded bg-muted/50" />
              <div className="h-8 w-24 rounded-lg bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
