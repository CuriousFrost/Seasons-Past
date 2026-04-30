import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { createCache } from "@/lib/cache";
import {
  acceptFriendRequest as acceptLib,
  declineFriendRequest as declineLib,
  getFriendPublicData as getDataLib,
  removeFriend as removeLib,
  sendFriendRequest as sendLib,
} from "@/lib/friends";
import type { Friend, FriendPublicData, FriendRequest } from "@/types";

type FriendsData = {
  friends: Friend[];
  pendingRequests: FriendRequest[];
};

const cache = createCache<FriendsData>();

export function useFriends(
  myFriendId: string | null,
  myUsername: string,
  myProfileImageUrl: string | null = null,
) {
  const { user } = useAuth();
  const cached = user ? cache.get(user.uid) : null;
  const [friends, setFriends] = useState<Friend[]>(cached?.friends ?? []);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>(
    cached?.pendingRequests ?? [],
  );
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  // Listen to own user doc for the friends array (denormalized Friend objects).
  useEffect(() => {
    if (!user) {
      setFriends([]);
      setLoading(false);
      return;
    }
    const userUid = user.uid;
    const unsub = onSnapshot(
      doc(db, "users", userUid),
      (snap) => {
        const data = snap.data();
        const list: Friend[] = data?.friends ?? [];
        setFriends(list);
        setLoading(false);
        const existing = cache.get(userUid);
        cache.set(userUid, {
          friends: list,
          pendingRequests: existing?.pendingRequests ?? [],
        });
      },
      (err) => {
        setError("Failed to load friends.");
        console.error("useFriends own-doc snapshot error:", err);
        setLoading(false);
      },
    );
    return unsub;
  }, [user]);

  // Listen to incoming friend requests addressed to the current user.
  useEffect(() => {
    if (!user) {
      setPendingRequests([]);
      return;
    }
    const userUid = user.uid;
    const q = query(
      collection(db, "friendRequests"),
      where("to", "==", userUid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: FriendRequest[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FriendRequest, "id">),
        }));
        setPendingRequests(list);
        const existing = cache.get(userUid);
        cache.set(userUid, {
          friends: existing?.friends ?? [],
          pendingRequests: list,
        });
      },
      (err) => {
        setError("Failed to load friend requests.");
        console.error("useFriends requests snapshot error:", err);
      },
    );
    return unsub;
  }, [user]);

  const sendRequest = useCallback(
    async (targetFriendId: string) => {
      if (!user || !myFriendId) throw new Error("Not signed in");
      await sendLib(
        user.uid,
        myFriendId,
        myUsername,
        myProfileImageUrl,
        targetFriendId,
      );
    },
    [user, myFriendId, myUsername, myProfileImageUrl],
  );

  const acceptRequest = useCallback(
    async (fromUid: string) => {
      if (!user) return;
      await acceptLib(fromUid);
    },
    [user],
  );

  const declineRequest = useCallback(
    async (fromUid: string) => {
      if (!user) return;
      await declineLib(user.uid, fromUid);
    },
    [user],
  );

  const removeFriend = useCallback(
    async (friendUid: string) => {
      if (!user) return;
      await removeLib(friendUid);
    },
    [user],
  );

  const getFriendData = useCallback(
    async (friendId: string): Promise<FriendPublicData> => {
      return getDataLib(friendId);
    },
    [],
  );

  return {
    friends,
    pendingRequests,
    loading,
    error,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    getFriendData,
  };
}
