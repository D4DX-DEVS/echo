"use client";

/** A GET form that submits itself whenever a field changes, so the filters apply without an Apply button. */
export default function AutoForm({ children, className }: { children: React.ReactNode; className?: string }) {
  return <form method="get" className={className} onChange={(e) => e.currentTarget.requestSubmit()}>{children}</form>;
}
