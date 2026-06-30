"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type RealtimeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

export type RealtimeRefreshSubscription = {
  table: string;
  event?: RealtimeEvent;
  filter?: string;
};

export function RealtimeRefresh({
  subscriptions,
  scope,
  debounceMs = 700,
}: {
  subscriptions: RealtimeRefreshSubscription[];
  scope: string;
  debounceMs?: number;
}) {
  const router = useRouter();
  const instanceId = useRef(Math.random().toString(36).slice(2));
  const subscriptionKey = useMemo(() => JSON.stringify(subscriptions), [subscriptions]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    const parsedSubscriptions = JSON.parse(subscriptionKey) as RealtimeRefreshSubscription[];
    if (!parsedSubscriptions.length) {
      return;
    }

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      refreshTimer = setTimeout(() => {
        router.refresh();
      }, debounceMs);
    };

    const channel = supabase.channel(`page-refresh:${scope}:${instanceId.current}`);
    for (const subscription of parsedSubscriptions) {
      channel.on(
        "postgres_changes",
        {
          event: subscription.event ?? "*",
          schema: "public",
          table: subscription.table,
          filter: subscription.filter,
        },
        scheduleRefresh,
      );
    }

    channel.subscribe();

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      void supabase.removeChannel(channel);
    };
  }, [debounceMs, router, scope, subscriptionKey]);

  return null;
}
