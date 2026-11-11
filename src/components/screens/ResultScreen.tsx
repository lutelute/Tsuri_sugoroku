import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { calculateScore } from '../../game/scoring';
import { saveEncyclopedia } from '../../utils/storage';
import { saveUserEncyclopedia, saveUserScore } from '../../lib/firestore';
import { FISH_DATABASE } from '../../data/fishDatabase';
import { personaOf } from '../../data/cpuPersonas';
import Button from '../shared/Button';
import Ruby from '../shared/Ruby';
import CityResult from '../city/CityResult';
import ResultBoard from '../result/ResultBoard';
import type { ResultEntry } from '../result/ResultBoard';
import { FishingHighlights } from '../result/HighlightCards';
import { RESULT_TEXT } from '../title/stageText';

export default function ResultScreen() {
  const { players, encyclopedias, initialEncyclopedias, resetGame, city, titleHistory, turn, fromFinal } = useGameStore(
    useShallow(s => ({
      players: s.players, encyclopedias: s.encyclopedias, initialEncyclopedias: s.initialEncyclopedias, resetGame: s.resetGame,
      city: s.city, titleHistory: s.cityTitleHistory, turn: s.turn,
      // 最終決算（4位から順に明かす）を見てから来たか。来たなら、ここでの明かし方は手早くする
      fromFinal: !!s.cityYearEnd?.final,
    })),
  );
  const savedRef = useRef(false);

  const results = useMemo(() => {
    return players
      .map((player, i) => ({
        player,
        score: calculateScore(player, encyclopedias[i] ?? {}),
      }))
      .sort((a, b) => b.score.total - a.score.total);
  }, [players, encyclopedias]);

  // ゲーム終了時に図鑑をクラウドに確実に保存 + ランキングにスコア保存
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const enc = encyclopedias[i];
      if (p.uid && enc) {
        saveUserEncyclopedia(p.uid, enc).catch(() => {});
      } else if (!p.uid && !p.isCpu && enc) {
        saveEncyclopedia(enc);
      }
    }

    // ランキング保存（ログインユーザーのみ。まちづくりは得点体系が違うので釣果番付には載せない）
    if (city) return;
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const enc = encyclopedias[i] ?? {};
      if (!p.uid) continue;
      const score = calculateScore(p, enc);
      const totalFish = FISH_DATABASE.length;
      const caughtCount = Object.keys(enc).filter(k => enc[k]).length;
      const encyclopediaRate = Math.round((caughtCount / totalFish) * 100);
      saveUserScore({
        uid: p.uid,
        displayName: p.name,
        score: score.total,
        fishCount: p.caughtFish.length,
        encyclopediaRate,
        date: new Date().toISOString(),
        breakdown: score,
      }).catch(() => {});
    }
  }, [players, encyclopedias, city]);

  // 順位を下から1人ずつ明かす。全員そろったら「この局の名場面」を出す
  const [revealed, setRevealed] = useState(false);
  const onRevealed = useCallback(() => setRevealed(true), []);

  // 釣り旅の番付（得点の内訳を積み上げの棒にする）
  const entries: ResultEntry[] = useMemo(() => results.map(({ player, score }) => ({
    playerIndex: player.id,
    name: player.name,
    color: player.color,
    pawnLabel: personaOf(player)?.mark ?? player.id + 1,
    total: score.total,
    parts: [
      { key: 'fish', label: RESULT_TEXT.fishPoints, icon: 'fish', value: score.fishPoints, color: '#2e5e8c' },
      { key: 'rarity', label: RESULT_TEXT.rarity, icon: 'gem', value: score.rarityBonus, color: '#8b5cf6' },
      { key: 'region', label: RESULT_TEXT.region, icon: 'map', value: score.regionBonus, color: '#2f9e6e' },
      { key: 'book', label: RESULT_TEXT.encyclopedia, icon: 'book', value: score.encyclopediaBonus, color: '#14b8a6' },
      { key: 'giant', label: RESULT_TEXT.giant, icon: 'star', value: score.giantFishBonus, color: '#e34a33' },
      { key: 'finish', label: RESULT_TEXT.finish, icon: 'flag', value: score.finishBonus, color: '#f59e0b' },
      { key: 'money', label: RESULT_TEXT.money, icon: 'coin', value: score.moneyBonus, color: '#8a7a64' },
    ],
    stats: [
      { key: 'caught', label: RESULT_TEXT.caught, icon: 'creel', text: `${player.caughtFish.length}匹` },
      { key: 'cash', label: RESULT_TEXT.cash, icon: 'coin', text: `¥${player.money.toLocaleString()}` },
      ...(player.finishOrder !== null ? [{ key: 'goal', label: 'ゴール', icon: 'flag' as const, text: `${player.finishOrder + 1}位` }] : []),
    ],
  })), [results]);

  return (
    <div className="flex flex-col items-center justify-center-safe h-full px-3 sm:px-4 overflow-y-auto py-6">
      <div className="hr-result">
        <header className="text-center mb-5">
          <h1 className="font-brush text-5xl sm:text-6xl leading-tight kinpaku kinpaku-shimmer animate-ink-rise">
            <Ruby>{city ? RESULT_TEXT.cityTitle : RESULT_TEXT.fishingTitle}</Ruby>
          </h1>
          <p className="text-washi/60 mt-1 font-mincho tracking-widest text-sm"><Ruby>{RESULT_TEXT.thanks}</Ruby></p>
        </header>

        {city ? (
          <CityResult city={city} players={players} titleHistory={titleHistory} turn={turn} fromFinal={fromFinal} />
        ) : (
          <>
            <ResultBoard entries={entries} unit="pt" winnerStamp={RESULT_TEXT.winnerFishing} onDone={onRevealed} />
            {revealed && <FishingHighlights players={players} encyclopedias={encyclopedias} initialEncyclopedias={initialEncyclopedias} />}
          </>
        )}

        <div className="mt-7 flex justify-center">
          <Button onClick={resetGame} variant="gold" size="lg">
            <Ruby>{RESULT_TEXT.backToTitle}</Ruby>
          </Button>
        </div>
      </div>
    </div>
  );
}
