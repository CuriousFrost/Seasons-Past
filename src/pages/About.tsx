import {
  BarChart3,
  Camera,
  Heart,
  Maximize2,
  Minimize2,
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
            Tap <strong>±#</strong> on a player's card to gain, lose, or set life by any
            amount with a number pad. Life goes up to 999.
          </li>
          <li>
            Tap the <Skull className="inline h-3.5 w-3.5" /> icon to track <strong>poison counters</strong>.
          </li>
          <li>
            Tap the <Swords className="inline h-3.5 w-3.5" /> icon to track <strong>commander damage</strong> from each opponent.
            21 or more from a single commander eliminates a player.
          </li>
          <li>
            Tap <strong>Assign Players</strong> (in the ☰ Menu on phones) to set up each seat.
            Use the dropdown to pick <strong>yourself</strong>, one of your{" "}
            <strong>pod buddies</strong>, or a guest, then tap one of their saved
            commanders. Your own commanders come from your decks.
          </li>
          <li>
            For anyone else, use the <Camera className="inline h-3.5 w-3.5" /> camera icon to
            scan a card or the ✏️ pencil icon to type a name. Commanders you add for a pod
            buddy are <strong>saved to that buddy</strong> for next time.
          </li>
          <li>
            Tap <Maximize2 className="inline h-3.5 w-3.5" /> <strong>Fullscreen</strong> to
            hide everything but the table. To exit, tap the round{" "}
            <Minimize2 className="inline h-3.5 w-3.5" /> button in the middle or{" "}
            <strong>pinch inward</strong> with two fingers.
          </li>
          <li>
            When only one player is left standing, a banner offers to{" "}
            <strong>Log Game</strong>. Your seat must be set to you and every seat needs a
            commander. Confirm your deck and the game is added to your Game Log and stats.
          </li>
          <li>Use <strong>Reset Game</strong> (or <strong>New Game</strong> after logging) to clear all totals.</li>
          <li>
            <strong>Undo</strong> takes back the last change. Holding + or tapping a button several
            times in a row counts as one step, and even a reset can be undone. The ±# pad also shows
            each player's recent life totals.
          </li>
          <li>
            Tap <strong>First player</strong> to have the counter spin around the table and pick who
            goes first at random.
          </li>
          <li>
            The <strong>game timer</strong> starts when you pick the <strong>First player</strong>
            (or on the first life change, if you skip that) and stops when one player is left. The
            game length is saved when you use Log Game.
          </li>
          <li>
            Tap the <Skull className="inline h-3.5 w-3.5" /> icon for <strong>Counters</strong>,
            which also has the 👑 <strong>Monarch</strong>. Taking it moves the crown from
            whoever had it.
          </li>
          <li>
            At the end of a game, <strong>Share result</strong> makes an image of the final table
            (winner, commanders, life totals, game length) to send to your group. It works for any
            game, even if nobody else has an account.
          </li>
        </ul>
        <Tip>
          Your game is saved on this device as you play, so a refresh, a back-swipe or the tablet
          going to sleep won't lose it. The screen also stays awake while the Life Counter is open.
        </Tip>
        <Tip>Commander damage is tracked per-source. If two opponents deal 20 damage each, neither is lethal — it must be 21 from the <em>same</em> commander.</Tip>
        <Tip>Players are out at 0 life, 10 poison, or 21 damage from a single commander, and all three count toward the end-of-game banner.</Tip>
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
            Tap <strong>+</strong> on a buddy's card to save the <strong>commanders they
            play</strong>. In the Life Counter, pick that buddy for a seat and tap one of
            their commanders, with no retyping. New commanders you type or scan for them
            there are added to their list automatically.
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
          <li>
            <strong>Head-to-Head</strong>: your record against each pod buddy and each commander they
            play, plus your toughest matchup.
          </li>
          <li>
            <strong>Deck Matchups</strong>: pick one of your decks to see its record against every
            commander it has faced.
          </li>
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
