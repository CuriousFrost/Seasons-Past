import { useState } from "react";
import { toast } from "sonner";
import { BarChart3, Check, Copy, Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AddFriendDialog } from "@/components/friends/AddFriendDialog";
import { FriendStatsDialog } from "@/components/friends/FriendStatsDialog";
import type { ProfileData } from "@/lib/friends";
import type { Friend, FriendPublicData, FriendRequest } from "@/types";

interface OnlineFriendsProps {
  profile: ProfileData | null;
  profileLoading: boolean;
  friends: Friend[];
  pendingRequests: FriendRequest[];
  friendsLoading: boolean;
  onSendRequest: (friendId: string) => Promise<void>;
  onAcceptRequest: (fromUid: string) => Promise<void>;
  onDeclineRequest: (fromUid: string) => Promise<void>;
  onRemoveFriend: (friendUid: string) => Promise<void>;
  onGetFriendData: (friendId: string) => Promise<FriendPublicData>;
}

export function OnlineFriends({
  profile,
  profileLoading,
  friends,
  pendingRequests,
  friendsLoading,
  onSendRequest,
  onAcceptRequest,
  onDeclineRequest,
  onRemoveFriend,
  onGetFriendData,
}: OnlineFriendsProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [statsFriendId, setStatsFriendId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function handleCopy() {
    if (!profile) return;
    await navigator.clipboard.writeText(profile.friendId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleAccept(fromUid: string) {
    setActionLoading(fromUid);
    try {
      await onAcceptRequest(fromUid);
    } catch (err) {
      console.error("acceptRequest error:", err);
      toast.error(
        err instanceof Error ? err.message : "Couldn't accept request.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline(fromUid: string) {
    setActionLoading(fromUid);
    try {
      await onDeclineRequest(fromUid);
    } catch (err) {
      console.error("declineRequest error:", err);
      toast.error(
        err instanceof Error ? err.message : "Couldn't decline request.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(friendUid: string) {
    setActionLoading(friendUid);
    try {
      await onRemoveFriend(friendUid);
    } catch (err) {
      console.error("removeFriend error:", err);
      toast.error(
        err instanceof Error ? err.message : "Couldn't remove friend.",
      );
    } finally {
      setActionLoading(null);
    }
  }

  if (profileLoading || friendsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="text-muted-foreground text-sm">Unable to load profile.</p>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── My Friend ID ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">My Friend ID</p>
          <p className="font-mono text-sm font-semibold tracking-widest">
            {profile.friendId}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="mr-1 h-3.5 w-3.5" />
          ) : (
            <Copy className="mr-1 h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {/* ── Pending Requests ─────────────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Requests{" "}
            <Badge variant="secondary" className="ml-1 text-xs">
              {pendingRequests.length}
            </Badge>
          </p>
          <ul className="divide-y overflow-hidden rounded-lg border">
            {pendingRequests.map((req) => (
              <li
                key={req.id}
                className="flex items-center gap-3 bg-background px-3 py-2.5"
              >
                {req.fromProfileImageUrl ? (
                  <img
                    src={req.fromProfileImageUrl}
                    alt={req.fromUsername}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {req.fromUsername.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-none">
                    {req.fromUsername}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {req.fromFriendId}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => handleAccept(req.from)}
                    disabled={actionLoading === req.from}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => handleDecline(req.from)}
                    disabled={actionLoading === req.from}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Friends List ─────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Friends{" "}
            <span className="normal-case font-normal">({friends.length})</span>
          </p>
          <Button
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={() => setAddOpen(true)}
          >
            <UserPlus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {friends.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            No friends yet. Share your Friend ID or add one by theirs.
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-lg border">
            {friends.map((friend) => (
              <li
                key={friend.friendId}
                className="flex items-center gap-3 bg-background px-3 py-2.5"
              >
                {friend.profileImageUrl ? (
                  <img
                    src={friend.profileImageUrl}
                    alt={friend.username}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {friend.username}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setStatsFriendId(friend.friendId)}
                    aria-label={`View ${friend.username}'s stats`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(friend.uid)}
                    disabled={actionLoading === friend.uid}
                    aria-label={`Remove ${friend.username}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────── */}
      <AddFriendDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSend={onSendRequest}
      />
      <FriendStatsDialog
        friendId={statsFriendId}
        onClose={() => setStatsFriendId(null)}
        onFetch={onGetFriendData}
      />
    </div>
  );
}
