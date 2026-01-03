"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      className="rounded-md border px-3 py-1.5 text-sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Log out
    </button>
  );
}

