import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCardImage } from "@/hooks/use-card-image";
import type { FacedCommanderStat } from "@/lib/stats";

interface MostFacedCommandersProps {
  data: FacedCommanderStat[];
}

function CommanderTile({ cmd, rank }: { cmd: FacedCommanderStat; rank: number }) {
  const imgUrl = useCardImage(cmd.commanderName);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-lg">
      {/* Full-bleed art */}
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={cmd.commanderName}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}

      {/* Gradient overlays — top for badges, bottom for name/stats */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent via-45% to-black/65" />

      {/* Rank badge — top left */}
      <div className="absolute top-1 left-1 bg-black/50 text-white text-[10px] font-bold px-1 py-0.5 rounded">
        #{rank}
      </div>

      {/* Win rate badge — top right */}
      <div className="absolute top-1 right-1 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded">
        {cmd.winRate}%
      </div>

      {/* Commander name + stats — bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-1.5 pb-1.5">
        <p className="text-white text-[11px] font-semibold truncate drop-shadow-lg leading-tight">
          {cmd.commanderName}
        </p>
        <p className="text-white/70 text-[10px] drop-shadow-md">
          {cmd.timesFaced}G · {cmd.winsAgainst}W
        </p>
      </div>
    </div>
  );
}

export function MostFacedCommanders({ data }: MostFacedCommandersProps) {
  const top = data.slice(0, 15);

  if (top.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Most Faced Commanders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No opponent commander data yet. Add commanders when logging games.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Faced Commanders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {top.map((cmd, i) => (
            <CommanderTile key={cmd.commanderName} cmd={cmd} rank={i + 1} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
