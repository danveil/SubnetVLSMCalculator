"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import {
  PublicNavigation,
  type PublicNavigationAuthState,
} from "./PublicNavigation";

function hasSupabaseBrowserConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}

function hasVerifiedSubject(result: {
  readonly data?: {
    readonly claims?: { readonly sub?: unknown } | null;
  } | null;
  readonly error?: unknown;
}) {
  const subject = result.data?.claims?.sub;
  return !result.error && typeof subject === "string" && subject.length > 0;
}

export function PublicNavigationSession() {
  const isConfigured = hasSupabaseBrowserConfig();
  const [authState, setAuthState] = useState<PublicNavigationAuthState>(
    isConfigured ? "checking" : "signed-out",
  );

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    let isMounted = true;
    let authRevision = 0;

    try {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        authRevision += 1;
        if (isMounted) {
          setAuthState(session ? "signed-in" : "signed-out");
        }
      });

      const claimsRevision = authRevision;
      void supabase.auth
        .getClaims()
        .then((result) => {
          if (isMounted && authRevision === claimsRevision) {
            setAuthState(
              hasVerifiedSubject(result) ? "signed-in" : "signed-out",
            );
          }
        })
        .catch(() => {
          if (isMounted && authRevision === claimsRevision) {
            setAuthState("signed-out");
          }
        });

      return () => {
        isMounted = false;
        data.subscription.unsubscribe();
      };
    } catch {
      queueMicrotask(() => {
        if (isMounted) {
          setAuthState("signed-out");
        }
      });

      return () => {
        isMounted = false;
      };
    }
  }, [isConfigured]);

  return <PublicNavigation authState={authState} />;
}
