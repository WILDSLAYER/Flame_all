"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { EMPTY_FILTER, Filters, type FilterValue } from "@/components/Filters";
import { InsultList } from "@/components/InsultList";
import { type FeedInsult, supabase } from "@/lib/supabase";

export default function RecentPage() {
  const { language } = useApp();
  const [filter, setFilter] = useState<FilterValue>(EMPTY_FILTER);
  const [insults, setInsults] = useState<FeedInsult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let q = supabase.from("insults_feed").select("*").eq("language", language);
    if (filter.game) q = q.contains("game_ids", [filter.game]);
    if (filter.category) q = q.eq("category", filter.category);
    q.order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setInsults((data as FeedInsult[]) ?? []);
        setLoading(false);
      });
  }, [language, filter]);

  return (
    <>
      <div className="page-head">
        <h1>Recientes</h1>
        <Filters value={filter} onChange={setFilter} />
      </div>
      <InsultList insults={insults} loading={loading} />
    </>
  );
}
