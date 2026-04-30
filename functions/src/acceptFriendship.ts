import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

interface AcceptFriendshipRequest {
  fromUid: string;
}

export const acceptFriendship = onCall<AcceptFriendshipRequest>(
  { enforceAppCheck: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to accept requests.");
    }
    const toUid = request.auth.uid;
    const { fromUid } = request.data ?? {};
    if (typeof fromUid !== "string" || !fromUid) {
      throw new HttpsError("invalid-argument", "fromUid is required.");
    }
    if (fromUid === toUid) {
      throw new HttpsError("invalid-argument", "Cannot accept your own request.");
    }

    const db = getFirestore();
    const requestId = `${fromUid}_${toUid}`;
    const reqRef = db.doc(`friendRequests/${requestId}`);
    const fromRef = db.doc(`users/${fromUid}`);
    const toRef = db.doc(`users/${toUid}`);

    await db.runTransaction(async (tx) => {
      const [reqSnap, fromSnap, toSnap] = await Promise.all([
        tx.get(reqRef),
        tx.get(fromRef),
        tx.get(toRef),
      ]);

      if (!reqSnap.exists) {
        throw new HttpsError("not-found", "Friend request not found.");
      }
      const req = reqSnap.data()!;
      if (req.to !== toUid || req.from !== fromUid) {
        throw new HttpsError("permission-denied", "Request does not belong to you.");
      }
      if (!fromSnap.exists || !toSnap.exists) {
        throw new HttpsError("failed-precondition", "User profile missing.");
      }

      const fromUser = fromSnap.data()!;
      const toUser = toSnap.data()!;

      const fromAsFriend = {
        uid: fromUid,
        friendId: fromUser.friendId ?? "",
        username: fromUser.username ?? "",
        profileImageUrl: fromUser.profileImageUrl ?? null,
      };
      const toAsFriend = {
        uid: toUid,
        friendId: toUser.friendId ?? "",
        username: toUser.username ?? "",
        profileImageUrl: toUser.profileImageUrl ?? null,
      };

      tx.update(toRef, {
        friends: FieldValue.arrayUnion(fromAsFriend),
        lastUpdated: FieldValue.serverTimestamp(),
      });
      tx.update(fromRef, {
        friends: FieldValue.arrayUnion(toAsFriend),
        lastUpdated: FieldValue.serverTimestamp(),
      });
      tx.delete(reqRef);
    });

    return { success: true };
  },
);
