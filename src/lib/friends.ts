import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Friend, FriendPublicData, FriendRequest } from "@/types";

// Characters excluding ambiguous: 0, O, 1, I, L
const FRIEND_ID_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateFriendId(): string {
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += FRIEND_ID_CHARS.charAt(
      Math.floor(Math.random() * FRIEND_ID_CHARS.length),
    );
  }
  return id;
}

// ─── Profile ────────────────────────────────────────────────────────

export interface ProfileData {
  friendId: string;
  username: string;
}

/**
 * Ensures the user has a profile with a friendId.
 * Creates one if it doesn't exist.
 */
export async function ensureUserProfile(
  uid: string,
  email: string,
): Promise<ProfileData> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  const data = snap.data();

  if (data?.friendId) {
    return {
      friendId: data.friendId,
      username: data.username ?? email.split("@")[0],
    };
  }

  // Generate unique friendId
  let friendId = generateFriendId();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await getDoc(doc(db, "friendIds", friendId));
    if (!existing.exists()) break;
    friendId = generateFriendId();
    attempts++;
  }
  if (attempts >= 10) {
    throw new Error("Could not generate unique Friend ID");
  }

  const username = data?.username ?? email.split("@")[0];

  // Create lookup doc
  await setDoc(doc(db, "friendIds", friendId), { uid });

  // Merge into user doc
  await setDoc(
    userRef,
    {
      friendId,
      username,
      email,
      friends: data?.friends ?? [],
      lastUpdated: serverTimestamp(),
    },
    { merge: true },
  );

  return { friendId, username };
}

export async function updateUsername(
  uid: string,
  username: string,
): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    { username, lastUpdated: serverTimestamp() },
    { merge: true },
  );
}

// ─── Friend Requests ────────────────────────────────────────────────

export async function sendFriendRequest(
  uid: string,
  myFriendId: string,
  myUsername: string,
  targetFriendId: string,
): Promise<void> {
  const normalized = targetFriendId.toUpperCase().trim();
  if (normalized.length !== 8) {
    throw new Error("Friend ID must be 8 characters");
  }
  if (normalized === myFriendId) {
    throw new Error("You cannot add yourself as a friend");
  }

  // Check if already friends
  const myDoc = await getDoc(doc(db, "users", uid));
  const myData = myDoc.data();
  if (myData?.friends?.includes(normalized)) {
    throw new Error("Already friends with this user");
  }

  // Look up target UID
  const friendIdDoc = await getDoc(doc(db, "friendIds", normalized));
  if (!friendIdDoc.exists()) {
    throw new Error("Friend ID not found");
  }

  const targetUid = friendIdDoc.data().uid as string;

  // Check for duplicate request
  const targetDoc = await getDoc(doc(db, "users", targetUid));
  const targetData = targetDoc.data();
  const pending: FriendRequest[] = targetData?.pendingFriendRequests ?? [];
  if (pending.some((r) => r.fromFriendId === myFriendId)) {
    throw new Error("Friend request already sent");
  }

  // Send request
  const request: FriendRequest = {
    fromFriendId: myFriendId,
    fromUsername: myUsername,
    timestamp: new Date().toISOString(),
  };

  await updateDoc(doc(db, "users", targetUid), {
    pendingFriendRequests: arrayUnion(request),
  });
}

export async function acceptFriendRequest(
  uid: string,
  myFriendId: string,
  fromFriendId: string,
): Promise<void> {
  const userRef = doc(db, "users", uid);

  // Find the request to remove it
  const snap = await getDoc(userRef);
  const pending: FriendRequest[] =
    snap.data()?.pendingFriendRequests ?? [];
  const request = pending.find((r) => r.fromFriendId === fromFriendId);
  if (!request) throw new Error("Friend request not found");

  // Add to my friends + remove request
  await updateDoc(userRef, {
    friends: arrayUnion(fromFriendId),
    pendingFriendRequests: arrayRemove(request),
    lastUpdated: serverTimestamp(),
  });

  // Bilateral: add me to their friends
  const friendIdDoc = await getDoc(doc(db, "friendIds", fromFriendId));
  if (friendIdDoc.exists()) {
    const friendUid = friendIdDoc.data().uid as string;
    await updateDoc(doc(db, "users", friendUid), {
      friends: arrayUnion(myFriendId),
      lastUpdated: serverTimestamp(),
    });
  }
}

export async function declineFriendRequest(
  uid: string,
  fromFriendId: string,
): Promise<void> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  const pending: FriendRequest[] =
    snap.data()?.pendingFriendRequests ?? [];
  const request = pending.find((r) => r.fromFriendId === fromFriendId);
  if (!request) throw new Error("Friend request not found");

  await updateDoc(userRef, {
    pendingFriendRequests: arrayRemove(request),
  });
}

export async function removeFriend(
  uid: string,
  friendId: string,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    friends: arrayRemove(friendId),
    lastUpdated: serverTimestamp(),
  });
}

// ─── Friend Data ────────────────────────────────────────────────────

export async function loadFriendsWithProfiles(
  friendIds: string[],
): Promise<Friend[]> {
  const friends: Friend[] = [];

  for (const friendId of friendIds) {
    const idDoc = await getDoc(doc(db, "friendIds", friendId));
    if (!idDoc.exists()) continue;

    const friendUid = idDoc.data().uid as string;
    const userDoc = await getDoc(doc(db, "users", friendUid));
    if (!userDoc.exists()) continue;

    const data = userDoc.data();
    friends.push({
      friendId,
      username: (data.username as string) ?? "Unknown",
      uid: friendUid,
    });
  }

  return friends;
}

export async function getFriendPublicData(
  friendId: string,
): Promise<FriendPublicData> {
  const idDoc = await getDoc(doc(db, "friendIds", friendId));
  if (!idDoc.exists()) throw new Error("Friend not found");

  const friendUid = idDoc.data().uid as string;
  const userDoc = await getDoc(doc(db, "users", friendUid));
  if (!userDoc.exists()) throw new Error("Friend data not found");

  const data = userDoc.data();
  return {
    friendId,
    username: (data.username as string) ?? "Unknown",
    decks: data.decks ?? [],
    games: data.games ?? [],
  };
}
