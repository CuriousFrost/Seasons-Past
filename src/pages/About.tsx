import {
  BarChart3,
  Camera,
  Heart,
  PlusCircle,
  ScrollText,
  Skull,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="space-y-2 pl-7 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
      💡 {children}
    </div>
  );
}

export default function About() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">About Seasons Past</h1>
        <p className="mt-1 text-muted-foreground">
          An EDH (Commander) game tracker for Magic: The Gathering. Log games, track stats,
          and manage your pod — all in one place.
        </p>
      </div>

      <Section icon={<PlusCircle className="h-5 w-5" />} title="Logging a Game">
        <p>Navigate to <strong>Add Game</strong> from the sidebar to record a game.</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Pick the date and select your deck.</li>
          <li>
            Add opponents — tap a <strong>buddy chip</strong> to quickly add a regular
            pod member, or press <strong>Add Opponent</strong> for someone new.
          </li>
          <li>
            Optionally type or scan each opponent's commander. Commander names are
            autocompleted via Scryfall — partial names work.
          </li>
          <li>Check <strong>"I won this game"</strong> if you won.</li>
          <li>
            If you lost, select the <strong>Winning Commander</strong> from the dropdown
            (only commanders you entered will appear).
          </li>
          <li>Press <strong>Log Game</strong>.</li>
        </ol>
        <Tip>The more commander info you enter, the richer your Statistics will be.</Tip>
      </Section>

      <Section icon={<Heart className="h-5 w-5" />} title="Life Counter">
        <p>Found under <strong>Life Counter</strong> in the sidebar. Rotate your phone to landscape to use it on mobile.</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Supports <strong>2–6 players</strong> with an auto-arranged grid.</li>
          <li><strong>Hold</strong> the − or + buttons for rapid life changes.</li>
          <li>
            Tap the <Skull className="inline h-3.5 w-3.5" /> icon to track <strong>poison counters</strong>.
          </li>
          <li>
            Tap the <Swords className="inline h-3.5 w-3.5" /> icon to track <strong>commander damage</strong> from each opponent.
            21 or more from a single commander eliminates a player.
          </li>
          <li>
            Open the <strong>Menu → Assign Commanders</strong> to link a commander to each player.
            Use the <Camera className="inline h-3.5 w-3.5" /> camera icon to scan a card or
            the ✏️ pencil icon to type a name. Once assigned, commander damage rows will show
            the commander name instead of "Player 1/2/3".
          </li>
          <li>Use <strong>Reset Game</strong> from the menu to clear all totals.</li>
        </ul>
        <Tip>Commander damage is tracked per-source. If two opponents deal 20 damage each, neither is lethal — it must be 21 from the <em>same</em> commander.</Tip>
      </Section>

      <Section icon={<Users className="h-5 w-5" />} title="Pod Buddies & Online Friends">
        <p>
          Manage your regular playgroup from the <strong>Pod Buddies</strong> page.
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <strong>Local Buddies</strong> are people you play with in person. Add them once
            and they appear as quick-select chips on the Add Game form.
          </li>
          <li>
            <strong>Online Friends</strong> connect via a unique <strong>Friend ID</strong>.
            Share your Friend ID (visible on the Pod Buddies page) for them to add you.
            Online friends also appear as chips in Add Game.
          </li>
          <li>
            Tap the <BarChart3 className="inline h-3.5 w-3.5" /> chart icon next to a friend
            to view their win stats against you.
          </li>
        </ul>
        <Tip>Your Friend ID is shown at the top of the Online Friends tab — tap Copy to share it.</Tip>
      </Section>

      <Section icon={<ScrollText className="h-5 w-5" />} title="Game Log">
        <p>
          The <strong>Game Log</strong> shows every recorded game. Tap a row to expand it
          and see full details including opponents and commander damage.
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Use the filters at the top to narrow by deck, result, or date range.</li>
          <li>Tap the edit icon on any game to correct mistakes.</li>
          <li>Tap the trash icon to delete a game (this cannot be undone).</li>
        </ul>
      </Section>

      <Section icon={<BarChart3 className="h-5 w-5" />} title="Statistics">
        <p>
          <strong>Statistics</strong> aggregates your logged games into charts and summaries.
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Win rate over time and by deck.</li>
          <li>Wins broken down by color identity.</li>
          <li>Most-played and best-performing commanders.</li>
          <li>Head-to-head breakdown per opponent.</li>
        </ul>
        <Tip>Stats update in real time as you log games — no refresh needed.</Tip>
      </Section>

      <Section icon={<Trophy className="h-5 w-5" />} title="Achievements">
        <p>
          <strong>Achievements</strong> unlock automatically as milestones are reached —
          no manual action needed.
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Examples: first game logged, first win, 10-game win streak, 100 games played.</li>
          <li>A notification banner appears briefly when a new achievement unlocks.</li>
          <li>View all unlocked and locked achievements on the Achievements page.</li>
        </ul>
      </Section>

      <Section icon={<Swords className="h-5 w-5" />} title="My Commanders">
        <p>
          The <strong>My Commanders</strong> page is your deck library. Add, edit, and
          archive decks here.
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>Each deck has a name, commander, and color identity.</li>
          <li>Archived decks are hidden from the Add Game dropdown but remain in your history.</li>
          <li>The W/L record badge on each card shows your all-time result with that deck.</li>
        </ul>
      </Section>

      <div className="rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Seasons Past — EDH Game Tracker</p>
        <p className="mt-1">
          Card data powered by{" "}
          <a
            href="https://scryfall.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Scryfall
          </a>
          . Magic: The Gathering is property of Wizards of the Coast.
        </p>
      </div>
    </div>
  );
}
