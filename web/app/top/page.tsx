"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { InsultList } from "@/components/InsultList";
import { type FeedInsult, supabase } from "@/lib/supabase";

type Tab = "semanal" | "historico";

export default function TopPage() {
  const { language } = useApp();
  const [tab, setTab] = useState<Tab>("semanal");
  const [insults, setInsults] = useState<FeedInsult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const req =
      tab === "semanal"
        ? supabase.rpc("top_weekly", { p_language: language, p_limit: 50 })
        : supabase
            .from("insults_feed")
            .select("*")
            .eq("language", language)
            .order("likes_count", { ascending: false })
            .limit(50);
    req.then(({ data }) => {
      setInsults((data as FeedInsult[]) ?? []);
      setLoading(false);
    });
  }, [language, tab]);

  return (
    <>
      <h1>Top</h1>
      <div className="tabs">
        <button className={tab === "semanal" ? "active" : ""} onClick={() => setTab("semanal")}>
          Semanal
        </button>
        <button className={tab === "historico" ? "active" : ""} onClick={() => setTab("historico")}>
          Histórico
        </button>
      </div>
      <InsultList insults={insults} loading={loading} showWeekly={tab === "semanal"} />
    </>
  );
}
