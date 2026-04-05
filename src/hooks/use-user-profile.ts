import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createCache } from "@/lib/cache";
import {
  ensureUserProfile,
  updateUsername as updateUsernameLib,
  uploadAvatar as uploadAvatarLib,
  removeAvatar as removeAvatarLib,
  type ProfileData,
} from "@/lib/friends";

const cache = createCache<ProfileData>();

export function useUserProfile() {
  const { user } = useAuth();
  const cached = user ? cache.get(user.uid) : null;
  const [profile, setProfile] = useState<ProfileData | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to cache updates so all mounted instances stay in sync
  useEffect(() => {
    if (!user) return;
    return cache.subscribe((cachedUid, value) => {
      if (cachedUid !== user.uid || !value) return;
      setProfile(value);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }
    const userUid = user.uid;

    if (cache.get(userUid)) {
      setProfile(cache.get(userUid));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const data = await ensureUserProfile(userUid, user!.email ?? "");
        if (!cancelled) {
          setProfile(data);
          cache.set(userUid, data);
        }
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
      const updated = { ...profile, username: trimmed };
      setProfile(updated);
      cache.set(user.uid, updated);

      try {
        await updateUsernameLib(user.uid, trimmed);
      } catch (err) {
        setError("Failed to update username.");
        console.error("updateUsername error:", err);
        // Revert
        setProfile(profile);
        cache.set(user.uid, profile);
      }
    },
    [user, profile],
  );

  const updateAvatar = useCallback(
    async (file: File | null) => {
      if (!user || !profile) return;

      if (file) {
        const objectUrl = URL.createObjectURL(file);
        const optimistic = { ...profile, profileImageUrl: objectUrl };
        setProfile(optimistic);
        cache.set(user.uid, optimistic);

        try {
          const url = await uploadAvatarLib(user.uid, file);
          URL.revokeObjectURL(objectUrl);
          const updated = { ...profile, profileImageUrl: url };
          setProfile(updated);
          cache.set(user.uid, updated);
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          setError("Failed to upload avatar.");
          console.error("updateAvatar error:", err);
          setProfile(profile);
          cache.set(user.uid, profile);
        }
      } else {
        const updated = { ...profile, profileImageUrl: undefined };
        setProfile(updated);
        cache.set(user.uid, updated);

        try {
          await removeAvatarLib(user.uid);
        } catch (err) {
          setError("Failed to remove avatar.");
          console.error("removeAvatar error:", err);
          setProfile(profile);
          cache.set(user.uid, profile);
        }
      }
    },
    [user, profile],
  );

  return { profile, loading, error, updateUsername, updateAvatar };
}
