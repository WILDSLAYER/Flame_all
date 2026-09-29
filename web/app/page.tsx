"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { InsultList } from "@/components/InsultList";
import { type FeedInsult, supabase } from "@/lib/supabase";

export default function RecentPage() {
  const { language } = useApp();
  const [insults, setInsults] = useState<FeedInsult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("insults_feed")
      .select("*")
      .eq("language", language)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setInsults((data as FeedInsult[]) ?? []);
        setLoading(false);
      });
  }, [language]);

  return (
    <>
      <h1>Recientes</h1>
      <InsultList insults={insults} loading={loading} />
    </>
  );
}
