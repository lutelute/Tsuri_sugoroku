import { useState } from 'react';
import { FISH_DATABASE } from '../../data/fishDatabase';
import type { Fish, FishRarity } from '../../game/types';
import FishCard from '../encyclopedia/FishCard';
import FishDetail from '../encyclopedia/FishDetail';
import Ruby from '../shared/Ruby';

const TIERS: { rarity: FishRarity; label: string }[] = [
  { rarity: 'common', label: 'コモン' },
  { rarity: 'uncommon', label: 'アンコモン' },
  { rarity: 'rare', label: 'レア' },
  { rarity: 'legendary', label: 'レジェンダリー' },
  { rarity: 'mythical', label: 'ミシカル' },
];
const SAMPLES = TIERS.flatMap(tier => {
  const fish = FISH_DATABASE.find(f => f.rarity === tier.rarity);
  return fish ? [{ ...tier, fish }] : [];
});
const noop = () => {};

/** 開発専用。保存した図鑑には触れず、すべて釣った状態で比較する。 */
export default function CardGallery() {
  const [selected, setSelected] = useState<Fish | null>(null);
  return (
    <main className="hf-gallery bg-ai-900 text-washi" data-gallery="cards">
      <h1 className="font-mincho text-xl text-kin-300"><Ruby>魚の札・螺鈿と金箔</Ruby></h1>
      <p className="my-3 text-sm text-washi/70"><Ruby>札を押すと詳しく見られます。すべて釣った状態の見本です。</Ruby></p>
      <div className="hf-gallery-cards">
        {SAMPLES.map(({ fish, label }) => (
          <section key={fish.id}>
            <h2 className="mb-2 text-xs text-kin-200">{label}</h2>
            <FishCard fish={fish} caught onClick={() => setSelected(fish)} />
          </section>
        ))}
      </div>
      <div className="hf-gallery-details">
        {SAMPLES.filter(({ rarity }) => rarity === 'legendary' || rarity === 'mythical').map(({ fish }) => (
          <FishDetail key={fish.id} fish={fish} caught embedded onClose={noop} />
        ))}
      </div>
      {selected && <FishDetail fish={selected} caught onClose={() => setSelected(null)} />}
    </main>
  );
}
