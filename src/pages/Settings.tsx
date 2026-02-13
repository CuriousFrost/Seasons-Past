import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useDecks } from "@/hooks/use-decks";
import { useGames } from "@/hooks/use-games";
import { usePodBuddies } from "@/hooks/use-pod-buddies";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { ExportMenu } from "@/components/ExportMenu";

export default function Settings() {
  const { user, logout } = useAuth();
  const { profile, loading, error, updateUsername } = useUserProfile();
  const { decks } = useDecks();
  const { games } = useGames();
  const { podBuddies } = usePodBuddies();
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleCopyFriendId() {
    if (!profile) return;
    await navigator.clipboard.writeText(profile.friendId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function startEditUsername() {
    if (!profile) return;
    setUsernameInput(profile.username);
    setEditingUsername(true);
  }

  async function saveUsername() {
    const trimmed = usernameInput.trim();
    if (!trimmed || trimmed === profile?.username) {
      setEditingUsername(false);
      return;
    }

    setSaving(true);
    try {
      await updateUsername(trimmed);
      setEditingUsername(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your account and app preferences.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading ? (
        <div className="max-w-lg space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="max-w-lg space-y-4">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="text-sm">{user?.email ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Friend ID */}
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Friend ID</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-mono break-all text-xl tracking-widest">
                    {profile.friendId}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyFriendId}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Share this with friends so they can add you.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Username */}
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Username</CardTitle>
              </CardHeader>
              <CardContent>
                {editingUsername ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      maxLength={30}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveUsername();
                        if (e.key === "Escape") setEditingUsername(false);
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={saveUsername}
                      disabled={saving || !usernameInput.trim()}
                    >
                      {saving ? "..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingUsername(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm">{profile.username}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startEditUsername}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <ThemeSwitcher className="max-w-xs" />
            </CardContent>
          </Card>

          {/* Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Data</CardTitle>
            </CardHeader>
            <CardContent>
              <ExportMenu games={games} decks={decks} podBuddies={podBuddies} />
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card>
            <CardContent className="pt-6">
              <Button variant="outline" onClick={logout}>
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
