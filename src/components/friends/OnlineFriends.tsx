import { useState } from "react";
import { BarChart3, Check, Copy, Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  onAcceptRequest: (fromFriendId: string) => Promise<void>;
  onDeclineRequest: (fromFriendId: string) => Promise<void>;
  onRemoveFriend: (friendId: string) => Promise<void>;
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

  async function handleAccept(fromFriendId: string) {
    setActionLoading(fromFriendId);
    try {
      await onAcceptRequest(fromFriendId);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline(fromFriendId: string) {
    setActionLoading(fromFriendId);
    try {
      await onDeclineRequest(fromFriendId);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(friendId: string) {
    setActionLoading(friendId);
    try {
      await onRemoveFriend(friendId);
    } finally {
      setActionLoading(null);
    }
  }

  if (profileLoading || friendsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full max-w-sm rounded-md" />
        <Skeleton className="h-32 rounded-md" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="text-muted-foreground text-sm">
        Unable to load profile.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Friend ID */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">My Friend ID</CardTitle>
          <CardAction>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="mr-1 h-4 w-4" />
              ) : (
                <Copy className="mr-1 h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="font-mono break-all text-2xl tracking-widest">
            {profile.friendId}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Share this with friends so they can add you.
          </p>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">
            Friend Requests{" "}
            <Badge variant="secondary" className="ml-1">
              {pendingRequests.length}
            </Badge>
          </h3>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <Card key={req.fromFriendId} className="gap-2 py-3">
                <CardHeader className="space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      {req.fromUsername}
                    </CardTitle>
                    <p className="text-muted-foreground break-all text-xs font-mono">
                      {req.fromFriendId}
                    </p>
                  </div>
                  <CardAction>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(req.fromFriendId)}
                        disabled={actionLoading === req.fromFriendId}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecline(req.fromFriendId)}
                        disabled={actionLoading === req.fromFriendId}
                      >
                        Decline
                      </Button>
                    </div>
                  </CardAction>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">
            Friends ({friends.length})
          </h3>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-1 h-4 w-4" />
            Add Friend
          </Button>
        </div>

        {friends.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No online friends yet. Share your Friend ID or add a friend by
            their ID.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {friends.map((friend) => (
              <Card key={friend.friendId} className="gap-2 py-3">
                <CardHeader className="space-y-0">
                  <div>
                    <CardTitle className="text-base">
                      {friend.username}
                    </CardTitle>
                    <p className="text-muted-foreground break-all text-xs font-mono">
                      {friend.friendId}
                    </p>
                  </div>
                  <CardAction>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setStatsFriendId(friend.friendId)}
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span className="sr-only">
                          View {friend.username}'s stats
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemove(friend.friendId)}
                        disabled={actionLoading === friend.friendId}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">
                          Remove {friend.username}
                        </span>
                      </Button>
                    </div>
                  </CardAction>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
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
