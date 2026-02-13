"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/i18n/provider";

type NavNode = {
  href: string;
  labelKey: "nav.cage" | "nav.shop" | "nav.inventory" | "nav.settings";
  type: "folder" | "file";
};

const NAV_NODES: NavNode[] = [
  { href: "/cage", labelKey: "nav.cage", type: "folder" },
  { href: "/shop", labelKey: "nav.shop", type: "folder" },
  { href: "/inventory", labelKey: "nav.inventory", type: "folder" },
  { href: "/settings", labelKey: "nav.settings", type: "file" },
];

export default function FolderTreeNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav aria-label="Folders">
      <p className="mb-4 text-xs uppercase tracking-[0.2em] text-stone-500">
        {t("nav.folderTree")}
      </p>
      <ul className="space-y-2 font-mono text-sm">
        {NAV_NODES.map((node) => {
          const active = pathname === node.href;
          return (
            <li key={node.href}>
              <Link
                href={node.href}
                className={`block rounded-md px-3 py-2 transition ${
                  active
                    ? "bg-stone-700 text-stone-100"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {node.type === "folder" ? "> " : "- "}
                {t(node.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
