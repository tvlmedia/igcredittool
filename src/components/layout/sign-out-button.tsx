"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        icon={<LogOut size={16} />}
        title="Sign out"
        className="w-full justify-start px-3"
      >
        Sign out
      </Button>
    </form>
  );
}
