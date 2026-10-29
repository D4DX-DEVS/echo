"use client";

/** Submit button that asks before going ahead, so a stray click can't delete anything. */
export default function ConfirmButton({ message, className = "", children, ...rest }: { message: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
