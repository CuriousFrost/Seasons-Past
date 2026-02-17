import { Skeleton } from "@/components/ui/skeleton";
import { usePodBuddies } from "@/hooks/use-pod-buddies";
import { useGames } from "@/hooks/use-games";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useFriends } from "@/hooks/use-friends";
import { PodBuddiesList } from "@/components/pod-buddies/PodBuddiesList";
import { OnlineFriends } from "@/components/friends/OnlineFriends";

export default function PodBuddies() {
  const {
    podBuddies,
    loading: buddiesLoading,
    error: buddiesError,
    addBuddy,
    removeBuddy,
  } = usePodBuddies();
  const { loading: gamesLoading } = useGames();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useUserProfile();
  const {
    friends,
    pendingRequests,
    loading: friendsLoading,
    error: friendsError,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    getFriendData,
  } = useFriends(profile?.friendId ?? null, profile?.username ?? "");

  const localLoading = buddiesLoading || gamesLoading;
  const error = buddiesError || profileError || friendsError;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pod Buddies</h1>
        <p className="text-muted-foreground text-sm">
          Track the players you sit down with most often.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Local Buddies */}
        <div>
          <h2 className="text-base font-semibold mb-3">Local Buddies</h2>
          {localLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-64 rounded-md" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <PodBuddiesList
              podBuddies={podBuddies}
              onAddBuddy={addBuddy}
              onRemoveBuddy={removeBuddy}
            />
          )}
        </div>

        {/* Online Friends */}
        <div>
          <h2 className="text-base font-semibold mb-3">
            Online Friends
            {pendingRequests.length > 0 && (
              <span className="bg-primary text-primary-foreground ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium">
                {pendingRequests.length}
              </span>
            )}
          </h2>
          <OnlineFriends
            profile={profile}
            profileLoading={profileLoading}
            friends={friends}
            pendingRequests={pendingRequests}
            friendsLoading={friendsLoading}
            onSendRequest={sendRequest}
            onAcceptRequest={acceptRequest}
            onDeclineRequest={declineRequest}
            onRemoveFriend={removeFriend}
            onGetFriendData={getFriendData}
          />
        </div>
      </div>
    </div>
  );
}
