import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  /** 読み上げ用の名前 */
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * 画面の下から出る和紙のシート（札の説明・相手選びなど）。
 * body へポータルで描くので、町パネル（backdrop-filter で fixed の基準が変わる）の中から開いても画面全体に出る。
 * 背景を押す・Esc で閉じる。開いたら最初のボタンにフォーカスを移す。
 */
export default function BottomSheet({ label, onClose, children }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        tabIndex={-1}
        aria-label="閉じる"
        className="fx-sheet-backdrop absolute inset-0 bg-black/45 cursor-default"
        onClick={() => closeRef.current()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="fx-sheet washi-card relative w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-t-2xl px-4 pt-2.5 shadow-2xl"
        style={{ borderTop: '3px solid #9a6f24' }}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#9a6f24]/40" aria-hidden="true" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
