import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  ensureUserProfile,
  updateUsername as updateUsernameLib,
  type ProfileData,
} from "@/lib/friends";

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const data = await ensureUserProfile(user!.uid, user!.email ?? "");
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load profile.");
          console.error("useUserProfile error:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updateUsername = useCallback(
    async (username: string) => {
      if (!user || !profile) return;
      const trimmed = username.trim();
      if (!trimmed) return;

      // Optimistic
      setProfile((prev) => (prev ? { ...prev, username: trimmed } : prev));

      try {
        await updateUsernameLib(user.uid, trimmed);
      } catch (err) {
        setError("Failed to update username.");
        console.error("updateUsername error:", err);
        // Revert
        setProfile((prev) =>
          prev ? { ...prev, username: profile.username } : prev,
        );
      }
    },
    [user, profile],
  );

  return { profile, loading, error, updateUsername };
}
