"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGUAGES } from "@/lib/supabase";
import { useApp } from "./AppContext";

const links = [
  { href: "/", label: "Recientes" },
  { href: "/top", label: "Top" },
  { href: "/nuevo", label: "Publicar" },
];

export function Nav() {
  const { session, profile, language, setLanguage } = useApp();
  const path = usePathname();

  return (
    <header className="nav">
      <Link href="/" className="brand">
        🔥 Flame_all
      </Link>
      <nav>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={path === l.href ? "active" : ""}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="nav-right">
        <select
          aria-label="Idioma"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        {session ? (
          <Link href="/perfil" className="btn ghost">
            {profile?.username ?? "Perfil"}
          </Link>
        ) : (
          <Link href="/login" className="btn">
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
}
