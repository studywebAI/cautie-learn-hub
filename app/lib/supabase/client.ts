// app/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { v4 as uuidv4 } from "uuid"; // ADD THIS LINE

const GUEST_ID_KEY = "guest_id"; // ADD THIS LINE

// ADD THIS FUNCTION
export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = uuidv4();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
