"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type QueryLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & {
  href: string;
};

function LinkWithQuery({ href, ...props }: QueryLinkProps) {
  const query = useSearchParams().toString();
  return <Link href={query ? `${href}?${query}` : href} {...props} />;
}

// Keeps the OAuth query string when switching between login and signup mid-flow.
export function QueryLink(props: QueryLinkProps) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <LinkWithQuery {...props} />
    </Suspense>
  );
}
