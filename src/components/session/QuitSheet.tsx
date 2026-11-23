// 「やめる」の画面: セーブしてやめる（タイトルの「つづきから」で再開）／ここで終わりにして順位を決める／つづける。
// 終わりにするほうは取り消せないので、もう一度だけ確かめる。
import { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { isCalmPhase } from '../../game/midGame';
import BottomSheet from '../fx/BottomSheet';
import Icon from '../shared/Icon';
import type { IconName } from '../shared/Icon';
import Ruby from '../shared/Ruby';
import { QUIT_TEXT } from './sessionText';

export default function QuitSheet({ onClose }: { onClose: () => void }) {
  const saveAndQuit = useGameStore(s => s.saveAndQuit);
  const endGame = useGameStore(s => s.endGame);
  const isCity = useGameStore(s => s.settings.mode === 'city');
  // 釣りの最中などは、その番のはじめから続く（game/midGame.ts の isCalmPhase）
  const calm = useGameStore(s => isCalmPhase(s.turnPhase));
  const [confirmEnd, setConfirmEnd] = useState(false);

  return (
    <BottomSheet label={QUIT_TEXT.title} onClose={onClose}>
      {!confirmEnd ? (
        <>
          <h3 className="font-brush text-3xl leading-tight text-[#2a2118] text-center mt-1 mb-3"><Ruby>{QUIT_TEXT.title}</Ruby></h3>
          <div className="flex flex-col gap-2.5">
            <QuitChoice
              icon="home"
              tone="ai"
              title={QUIT_TEXT.save}
              sub={calm ? QUIT_TEXT.saveSub : `${QUIT_TEXT.saveSub}（${QUIT_TEXT.saveSubTurnStart}）`}
              onClick={() => { onClose(); saveAndQuit(); }}
            />
            <QuitChoice
              icon="trophy"
              tone="shu"
              title={QUIT_TEXT.end}
              sub={isCity ? QUIT_TEXT.endSubCity : QUIT_TEXT.endSubFishing}
              onClick={() => setConfirmEnd(true)}
            />
          </div>
          <SheetButton onClick={onClose}>{QUIT_TEXT.keepPlaying}</SheetButton>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mt-1 mb-3">
            <span className="qt-seal qt-seal-shu shrink-0" aria-hidden="true"><Icon name="trophy" size={26} /></span>
            <div className="text-left">
              <p className="font-brush text-2xl leading-tight text-[#2a2118]"><Ruby>{QUIT_TEXT.confirmTitle}</Ruby></p>
              <p className="text-xs text-[#4a3a28] mt-1"><Ruby>{QUIT_TEXT.confirmSub}</Ruby></p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirmEnd(false)}
              className="min-h-12 rounded-xl border border-[#9a6f24]/50 bg-[#2a2118]/5 font-mincho font-bold text-[#2a2118] cursor-pointer hover:bg-[#2a2118]/10 active:scale-95 transition"
            >
              <Ruby>{QUIT_TEXT.back}</Ruby>
            </button>
            <button
              type="button"
              onClick={() => { onClose(); endGame(); }}
              className="min-h-12 rounded-xl border-2 border-[#b8321e] bg-[#c8402a] font-mincho font-bold text-[#fffaf0] cursor-pointer hover:bg-[#b8321e] active:scale-95 transition shadow"
            >
              <Ruby>{QUIT_TEXT.confirmYes}</Ruby>
            </button>
          </div>
          <div className="h-4" />
        </>
      )}
    </BottomSheet>
  );
}

function QuitChoice({ icon, tone, title, sub, onClick }: { icon: IconName; tone: 'ai' | 'shu'; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`qt-choice qt-${tone} w-full min-h-16 flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left cursor-pointer active:scale-[0.98] transition`}
    >
      <span className="qt-seal shrink-0" aria-hidden="true"><Icon name={icon} size={26} /></span>
      <span className="min-w-0">
        <span className="block font-mincho font-bold text-base sm:text-lg text-[#2a2118] leading-snug"><Ruby>{title}</Ruby></span>
        <span className="block text-xs text-[#4a3a28] mt-0.5 leading-relaxed"><Ruby>{sub}</Ruby></span>
      </span>
    </button>
  );
}

export function SheetButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2.5 mb-4 w-full min-h-11 rounded-xl border border-[#9a6f24]/40 bg-[#2a2118]/5 text-sm text-[#2a2118] font-mincho cursor-pointer hover:bg-[#2a2118]/10"
    >
      <Ruby>{children}</Ruby>
    </button>
  );
}
