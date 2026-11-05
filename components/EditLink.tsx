"use client";
import { useEffect, useState } from "react";

/** "Edit post" shortcut for signed-in admins. The page itself is cached for everyone, so it reads the flag cookie set at login; /admin still checks the real session. */
export default function EditLink({ id }: { id: number }) {
  const [admin, setAdmin] = useState(false);
  useEffect(() => setAdmin(/(?:^|; )echo_editor=1/.test(document.cookie)), []);
  if (!admin) return null;
  return <a href={`/admin/posts/${id}`} className="ml-auto rounded bg-accent px-3 py-1 text-[0.8rem] font-bold text-white hover:opacity-90">Edit post</a>;
}
