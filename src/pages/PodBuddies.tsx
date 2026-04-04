import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const localContent = localLoading ? (
    <div className="space-y-3">
      <Skeleton className="h-9 w-64 rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  ) : (
    <PodBuddiesList
      podBuddies={podBuddies}
      onAddBuddy={addBuddy}
      onRemoveBuddy={removeBuddy}
    />
  );

  const onlineContent = (
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
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pod Buddies</h1>
        <p className="text-muted-foreground text-sm">
          Track the players you sit down with most often.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="local">
          <TabsList className="w-full">
            <TabsTrigger value="local" className="flex-1">
              Local
              {podBuddies.length > 0 && (
                <span className="ml-1.5 font-normal text-muted-foreground">
                  ({podBuddies.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="online" className="flex-1">
              Online
              {pendingRequests.length > 0 && (
                <span className="bg-primary text-primary-foreground ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="local" className="mt-4">
            {localContent}
          </TabsContent>
          <TabsContent value="online" className="mt-4">
            {onlineContent}
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: side by side */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8">
        <div>
          <h2 className="mb-3 text-sm font-semibold">
            Local Buddies
            {podBuddies.length > 0 && (
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({podBuddies.length})
              </span>
            )}
          </h2>
          {localContent}
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">
            Online Friends
            {pendingRequests.length > 0 && (
              <span className="bg-primary text-primary-foreground ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium">
                {pendingRequests.length}
              </span>
            )}
          </h2>
          {onlineContent}
        </div>
      </div>
    </div>
  );
}
