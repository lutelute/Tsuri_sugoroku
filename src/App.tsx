import { useGameStore } from './store/useGameStore';
import TitleScreen from './components/screens/TitleScreen';
import SetupScreen from './components/screens/SetupScreen';
import GameScreen from './components/screens/GameScreen';
import ResultScreen from './components/screens/ResultScreen';

export default function App() {
  const screen = useGameStore(s => s.screen);

  return (
    <div className="w-full h-full">
      {screen === 'title' && <TitleScreen />}
      {screen === 'setup' && <SetupScreen />}
      {screen === 'game' && <GameScreen />}
      {screen === 'result' && <ResultScreen />}
    </div>
  );
}
