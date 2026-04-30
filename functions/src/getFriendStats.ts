import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";

interface GetFriendStatsRequest {
  friendId: string;
}

interface FriendEntry {
  uid?: string;
  friendId?: string;
}

export const getFriendStats = onCall<GetFriendStatsRequest>(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to view friend stats.");
    }
    const callerUid = request.auth.uid;
    const { friendId } = request.data ?? {};
    if (typeof friendId !== "string" || friendId.length !== 8) {
      throw new HttpsError("invalid-argument", "friendId must be 8 characters.");
    }

    const db = getFirestore();

    const idSnap = await db.doc(`friendIds/${friendId}`).get();
    if (!idSnap.exists) {
      throw new HttpsError("not-found", "Friend not found.");
    }
    const friendUid = idSnap.data()?.uid as string | undefined;
    if (!friendUid) {
      throw new HttpsError("not-found", "Friend not found.");
    }

    // Verify the caller is friends with the target — both directions, defensive.
    const callerSnap = await db.doc(`users/${callerUid}`).get();
    const callerFriends: FriendEntry[] = callerSnap.data()?.friends ?? [];
    const isFriend = callerFriends.some((f) => f.uid === friendUid);
    if (!isFriend) {
      throw new HttpsError(
        "permission-denied",
        "You can only view stats for accepted friends.",
      );
    }

    const friendSnap = await db.doc(`users/${friendUid}`).get();
    if (!friendSnap.exists) {
      throw new HttpsError("not-found", "Friend profile not found.");
    }
    const data = friendSnap.data()!;

    return {
      friendId,
      username: (data.username as string) ?? "Unknown",
      decks: data.decks ?? [],
      games: data.games ?? [],
      profileImageUrl: (data.profileImageUrl as string | undefined) ?? null,
    };
  },
);
