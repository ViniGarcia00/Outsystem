"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { mainNavigation } from "@/lib/navigation";
import type { BreadcrumbSegment } from "@/types";

function labelForHref(href: string, segment: string): string {
  const known = mainNavigation.find((item) => item.href === href);
  if (known) {
    return known.title;
  }
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

function buildSegments(pathname: string): BreadcrumbSegment[] {
  const parts = pathname.split("/").filter(Boolean);
  let cumulative = "";
  return parts.map((part, index) => {
    cumulative += `/${part}`;
    const isLast = index === parts.length - 1;
    return {
      label: labelForHref(cumulative, part),
      href: isLast ? undefined : cumulative,
    };
  });
}

/** Trilha de navegação derivada da rota atual. */
export function BreadcrumbNav() {
  const pathname = usePathname();
  const segments = buildSegments(pathname);

  if (segments.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Trilha de navegação" className="min-w-0">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {segments.map((segment, index) => (
          <Fragment key={`${segment.label}-${index}`}>
            {index > 0 && (
              <ChevronRight
                className="h-4 w-4 shrink-0 opacity-60"
                aria-hidden
              />
            )}
            <li className="truncate">
              {segment.href ? (
                <Link
                  href={segment.href}
                  className="transition-colors hover:text-foreground"
                >
                  {segment.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {segment.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
