import {
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { httpsCallable, getFunctions } from "firebase/functions";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import app, { db, storage } from "@/lib/firebase";
import type { Friend, FriendPublicData } from "@/types";

const cloudFns = getFunctions(app);

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
  profileImageUrl?: string;
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
      profileImageUrl: data.profileImageUrl as string | undefined,
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

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const storageRef = ref(storage, `avatars/${uid}/profile.jpg`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await setDoc(
    doc(db, "users", uid),
    { profileImageUrl: url, lastUpdated: serverTimestamp() },
    { merge: true },
  );
  return url;
}

export async function removeAvatar(uid: string): Promise<void> {
  const storageRef = ref(storage, `avatars/${uid}/profile.jpg`);
  try {
    await deleteObject(storageRef);
  } catch {
    // ignore if file doesn't exist
  }
  await updateDoc(doc(db, "users", uid), {
    profileImageUrl: deleteField(),
    lastUpdated: serverTimestamp(),
  });
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

const acceptFriendshipFn = httpsCallable<
  { fromUid: string },
  { success: boolean }
>(cloudFns, "acceptFriendship");

const removeFriendshipFn = httpsCallable<
  { friendUid: string },
  { success: boolean }
>(cloudFns, "removeFriendship");

const getFriendStatsFn = httpsCallable<
  { friendId: string },
  FriendPublicData
>(cloudFns, "getFriendStats");

export async function sendFriendRequest(
  myUid: string,
  myFriendId: string,
  myUsername: string,
  myProfileImageUrl: string | null,
  targetFriendId: string,
): Promise<void> {
  const normalized = targetFriendId.toUpperCase().trim();
  if (normalized.length !== 8) {
    throw new Error("Friend ID must be 8 characters");
  }
  if (normalized === myFriendId) {
    throw new Error("You cannot add yourself as a friend");
  }

  // Check if already friends — read own doc only.
  const myDoc = await getDoc(doc(db, "users", myUid));
  const myFriends: Friend[] = myDoc.data()?.friends ?? [];
  if (myFriends.some((f) => f.friendId === normalized)) {
    throw new Error("Already friends with this user");
  }

  // Look up target UID via the friendIds index (cross-user read allowed).
  const friendIdDoc = await getDoc(doc(db, "friendIds", normalized));
  if (!friendIdDoc.exists()) {
    throw new Error("Friend ID not found");
  }
  const targetUid = friendIdDoc.data().uid as string;

  // Create the request doc. Deterministic id prevents duplicates — rules only
  // allow `create`, so a re-send to the same person produces a permission
  // error which we translate to "already sent". We can't pre-check via getDoc
  // because rules deny reading non-existent documents.
  const requestId = `${myUid}_${targetUid}`;
  const reqRef = doc(db, "friendRequests", requestId);
  try {
    await setDoc(reqRef, {
      from: myUid,
      to: targetUid,
      fromFriendId: myFriendId,
      fromUsername: myUsername,
      fromProfileImageUrl: myProfileImageUrl,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    if (
      err instanceof Error &&
      /permission|insufficient/i.test(err.message)
    ) {
      throw new Error("Friend request already sent");
    }
    throw err;
  }
}

export async function acceptFriendRequest(fromUid: string): Promise<void> {
  await acceptFriendshipFn({ fromUid });
}

export async function declineFriendRequest(
  myUid: string,
  fromUid: string,
): Promise<void> {
  await deleteDoc(doc(db, "friendRequests", `${fromUid}_${myUid}`));
}

export async function removeFriend(friendUid: string): Promise<void> {
  await removeFriendshipFn({ friendUid });
}

// ─── Friend Data ────────────────────────────────────────────────────

export async function getFriendPublicData(
  friendId: string,
): Promise<FriendPublicData> {
  const result = await getFriendStatsFn({ friendId });
  return result.data;
}
