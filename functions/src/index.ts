import { initializeApp } from "firebase-admin/app";

initializeApp();

export { recognizeCard } from "./recognizeCard";
export { acceptFriendship } from "./acceptFriendship";
export { removeFriendship } from "./removeFriendship";
export { getFriendStats } from "./getFriendStats";
