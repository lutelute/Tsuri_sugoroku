import { useGameStore } from '../../store/useGameStore';
import PlayerPanel from './PlayerPanel';

export default function AllPlayersBar() {
  const { players, currentPlayerIndex } = useGameStore();

  return (
    <div className="flex gap-2 p-2 overflow-x-auto">
      {players.map((player, i) => (
        <div key={player.id} className="min-w-[140px] flex-1">
          <PlayerPanel
            player={player}
            isActive={i === currentPlayerIndex}
          />
        </div>
      ))}
    </div>
  );
}
