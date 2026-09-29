"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { InsultList } from "@/components/InsultList";
import { type FeedInsult, supabase } from "@/lib/supabase";

export default function MyInsultsPage() {
  const { session, ready } = useApp();
  const [insults, setInsults] = useState<FeedInsult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    supabase
      .from("insults_feed")
      .select("*")
      .eq("author_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setInsults((data as FeedInsult[]) ?? []);
        setLoading(false);
      });
  }, [session]);

  if (ready && !session) {
    return (
      <p>
        <Link href="/login">Inicia sesión</Link> para ver tus insultos.
      </p>
    );
  }

  const remove = async (id: number) => {
    const { error } = await supabase.from("insults").delete().eq("id", id);
    if (!error) setInsults((list) => list.filter((i) => i.id !== id));
  };

  const totalLikes = insults.reduce((s, i) => s + i.likes_count, 0);

  return (
    <>
      <div className="page-head">
        <h1>Mis insultos</h1>
        {!loading && (
          <span className="muted">
            {insults.length} publicados · ♥ {totalLikes} en total
          </span>
        )}
      </div>
      {!loading && insults.length === 0 ? (
        <p className="muted">
          Aún no has publicado nada. <Link href="/nuevo">Publica tu primer insulto</Link>.
        </p>
      ) : (
        <InsultList insults={insults} loading={loading} onDelete={remove} />
      )}
    </>
  );
}
