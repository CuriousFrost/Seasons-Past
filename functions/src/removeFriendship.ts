import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

interface RemoveFriendshipRequest {
  friendUid: string;
}

interface FriendEntry {
  uid?: string;
  friendId?: string;
  username?: string;
  profileImageUrl?: string | null;
}

export const removeFriendship = onCall<RemoveFriendshipRequest>(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to remove friends.");
    }
    const myUid = request.auth.uid;
    const { friendUid } = request.data ?? {};
    if (typeof friendUid !== "string" || !friendUid || friendUid === myUid) {
      throw new HttpsError("invalid-argument", "Valid friendUid is required.");
    }

    const db = getFirestore();
    const myRef = db.doc(`users/${myUid}`);
    const friendRef = db.doc(`users/${friendUid}`);

    await db.runTransaction(async (tx) => {
      const [mySnap, friendSnap] = await Promise.all([
        tx.get(myRef),
        tx.get(friendRef),
      ]);
      if (!mySnap.exists) {
        throw new HttpsError("not-found", "Your profile is missing.");
      }

      const myFriends: FriendEntry[] = mySnap.data()?.friends ?? [];
      const updatedMyFriends = myFriends.filter((f) => f.uid !== friendUid);
      tx.update(myRef, {
        friends: updatedMyFriends,
        lastUpdated: FieldValue.serverTimestamp(),
      });

      if (friendSnap.exists) {
        const theirFriends: FriendEntry[] = friendSnap.data()?.friends ?? [];
        const updatedTheirFriends = theirFriends.filter((f) => f.uid !== myUid);
        tx.update(friendRef, {
          friends: updatedTheirFriends,
          lastUpdated: FieldValue.serverTimestamp(),
        });
      }
    });

    return { success: true };
  },
);
