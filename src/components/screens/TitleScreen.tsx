import { useGameStore, hasSavedGame } from '../../store/useGameStore';
import Button from '../shared/Button';

export default function TitleScreen() {
  const setScreen = useGameStore(s => s.setScreen);
  const resumeGame = useGameStore(s => s.resumeGame);
  const savedExists = hasSavedGame();

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 select-none">
      {/* タイトルロゴ */}
      <div className="mb-8 text-center">
        <div className="text-6xl mb-4 animate-bounce">🎣</div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-2">
          <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            釣りすごろく
          </span>
        </h1>
        <p className="text-lg text-blue-200/70 font-medium">
          日本列島 釣り旅
        </p>
      </div>

      {/* 波のアニメーション */}
      <div className="w-full max-w-md mb-12 opacity-30">
        <svg viewBox="0 0 400 40" className="w-full">
          <path
            d="M0,20 Q50,0 100,20 Q150,40 200,20 Q250,0 300,20 Q350,40 400,20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-cyan-300"
          >
            <animate
              attributeName="d"
              dur="3s"
              repeatCount="indefinite"
              values="
                M0,20 Q50,0 100,20 Q150,40 200,20 Q250,0 300,20 Q350,40 400,20;
                M0,20 Q50,40 100,20 Q150,0 200,20 Q250,40 300,20 Q350,0 400,20;
                M0,20 Q50,0 100,20 Q150,40 200,20 Q250,0 300,20 Q350,40 400,20
              "
            />
          </path>
        </svg>
      </div>

      {/* ボタン */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button
          onClick={() => setScreen('setup')}
          variant="gold"
          size="lg"
          className="w-full text-center"
        >
          ゲームスタート
        </Button>
        {savedExists && (
          <Button
            onClick={resumeGame}
            variant="secondary"
            size="lg"
            className="w-full text-center"
          >
            つづきから
          </Button>
        )}
      </div>

      {/* フッター */}
      <p className="absolute bottom-4 text-xs text-white/30">
        稚内から那覇まで、日本の魚を釣り尽くせ！
      </p>
    </div>
  );
}
