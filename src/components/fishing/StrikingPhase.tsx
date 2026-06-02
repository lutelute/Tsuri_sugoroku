import Ruby from '../shared/Ruby';

interface StrikingPhaseProps {
  success: boolean;
}

export default function StrikingPhase({ success }: StrikingPhaseProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {success ? (
        <div className="text-center animate-bounce">
          <div className="text-7xl mb-4">🎯</div>
          <p className="text-3xl font-bold text-green-400">ヒット！</p>
          <p className="text-white/60 mt-2"><Ruby>魚がかかった！</Ruby></p>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-7xl mb-4">💨</div>
          <p className="text-3xl font-bold text-red-400">ミス...</p>
          <p className="text-white/60 mt-2"><Ruby>魚に逃げられた</Ruby></p>
        </div>
      )}
    </div>
  );
}
