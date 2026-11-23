import { describe, it, expect } from 'vitest';
import {
  MAX_PLAYERS, canAddPlayer, carryRosterIntoSave, createLatePlayer, isCalmPhase, lateLinkMoney, linkRefusal,
  mergeCaughtIntoEncyclopedia, withLatePlayer, withLinkedAccount,
} from './midGame';
import { INITIAL_MONEY } from './constants';
import { CITY_INITIAL_MONEY } from './city';
import type { CaughtFish, GameSettings, GameState, Player } from './types';

const fishingSettings: GameSettings = {
  playerCount: 2, playerNames: ['たろう', 'お松'], playerUids: [null, null], maxTurns: 50, mode: 'fishing', playerKinds: ['human', 'cpu'],
};

function player(i: number, over: Partial<Player> = {}): Player {
  return { ...createLatePlayer(fishingSettings, i, `p${i}`, 1), joinedTurn: undefined, ...over };
}

const caught = (fishId: string): CaughtFish => ({ fishId, caughtAt: 'n1', turn: 2, size: 1 });

function roster(players: Player[], over: Partial<GameState> = {}) {
  return {
    players,
    settings: { ...fishingSettings, playerCount: players.length },
    encyclopedias: players.map(() => ({ local: true })),
    initialEncyclopedias: players.map(() => ({ local: true })),
    cityCards: null,
    gameOver: false,
    turn: 5,
    ...over,
  } as Pick<GameState, 'players' | 'settings' | 'encyclopedias' | 'initialEncyclopedias' | 'cityCards' | 'gameOver' | 'turn'>;
}

describe('途中から仲間を増やす', () => {
  it('4人までで、終わった対局には増やせない', () => {
    expect(MAX_PLAYERS).toBe(4);
    expect(canAddPlayer({ players: [player(0)], gameOver: false })).toBe(true);
    expect(canAddPlayer({ players: [0, 1, 2, 3].map(i => player(i)), gameOver: false })).toBe(false);
    expect(canAddPlayer({ players: [player(0)], gameOver: true })).toBe(false);
  });

  it('釣り旅はスタートから、はじめの道具とお金で入り、手番は最後', () => {
    const s = roster([player(0), player(1, { isCpu: true, cpuStyle: 'steady' })]);
    const patch = withLatePlayer(s, ' はなこ ', { a: true })!;
    expect(patch.players).toHaveLength(3);
    const p = patch.players![2];
    expect(p).toMatchObject({ id: 2, name: 'はなこ', currentNode: 'start', money: INITIAL_MONEY, startMoney: INITIAL_MONEY, joinedTurn: 5, isCpu: false });
    expect(p.equipment.inventory.length).toBeGreaterThan(0);
    expect(patch.settings).toMatchObject({ playerCount: 3, playerNames: ['p0', 'p1', 'はなこ'], playerUids: [null, null, null], playerKinds: ['human', 'cpu', 'human'] });
    expect(patch.encyclopedias).toHaveLength(3);
    expect(patch.initialEncyclopedias![2]).toEqual({ a: true });
  });

  it('名前が空なら「プレイヤーN」', () => {
    const patch = withLatePlayer(roster([player(0)]), '  ', {})!;
    expect(patch.players![1].name).toBe('プレイヤー2');
  });

  it('まちづくりは最初の町のお金で入り、カードの手札の枠も増える', () => {
    const s = roster([player(0)], {
      settings: { ...fishingSettings, mode: 'city', playerCount: 1 },
      cityCards: { hands: [['kyuko']], slow: [], insured: [], landGrab: [] },
    });
    const patch = withLatePlayer(s, 'じろう', {})!;
    expect(patch.players![1].money).toBe(CITY_INITIAL_MONEY);
    expect(patch.cityCards!.hands).toEqual([['kyuko'], []]);
  });
});

describe('途中でアカウントにつなぐ', () => {
  it('CPU・つないである席・ほかの席と同じアカウントはつなげない（入れ替えはしない）', () => {
    const players = [player(0, { uid: 'u0' }), player(1, { isCpu: true }), player(2)];
    expect(linkRefusal(players, 0, 'x')).toBe('already_linked');
    expect(linkRefusal(players, 1, 'x')).toBe('cpu');
    expect(linkRefusal(players, 2, 'u0')).toBe('duplicate');
    expect(linkRefusal(players, 3, 'x')).toBe('no_player');
    expect(linkRefusal(players, 2, 'x')).toBeNull();
  });

  it('それまでに釣った魚がアカウントの図鑑に入り、この端末の図鑑は混ぜない', () => {
    const p = player(1, { caughtFish: [caught('aji'), caught('tai')] });
    expect(mergeCaughtIntoEncyclopedia({ saba: true }, p)).toEqual({ saba: true, aji: true, tai: true });
    const s = roster([player(0), p]);
    const patch = withLinkedAccount(s, 1, { uid: 'u1', displayName: 'taro' }, { saba: true })!;
    expect(patch.players![1]).toMatchObject({ uid: 'u1', name: 'taro', lateLink: true });
    expect(patch.encyclopedias![1]).toEqual({ saba: true, aji: true, tai: true });
    expect(patch.encyclopedias![0]).toEqual({ local: true });
    // NEW の印はアカウントの図鑑から見て付ける
    expect(patch.initialEncyclopedias![1]).toEqual({ saba: true });
    expect(patch.settings!.playerUids).toEqual([null, 'u1']);
    expect(withLinkedAccount(s, 0, { uid: 'u1', displayName: 'x' }, {})).not.toBeNull();
    expect(withLinkedAccount({ ...s, players: patch.players! }, 0, { uid: 'u1', displayName: 'x' }, {})).toBeNull();
  });

  it('お金は増えた分だけ足す（減っていたら足さない・引かない）', () => {
    expect(lateLinkMoney(10000, player(0, { money: 8000, startMoney: 3000 }))).toBe(15000);
    expect(lateLinkMoney(10000, player(0, { money: 1000, startMoney: 3000 }))).toBe(10000);
    // 新しく作ったアカウント（お金の記録が無い）は、はじめのお金に足す
    expect(lateLinkMoney(null, player(0, { money: 5000, startMoney: 3000 }))).toBe(INITIAL_MONEY + 2000);
    // 古い保存（startMoney が無い）は、はじめのお金から数える
    expect(lateLinkMoney(0, player(0, { money: 4000, startMoney: undefined }))).toBe(1000);
  });
});

describe('途中でやめるときの保存', () => {
  it('行動を選ぶ前・番の切り替え・町の画面・月末はそのまま保存できる', () => {
    for (const ph of ['idle', 'action_choice', 'turn_end', 'city', 'city_report', 'city_yearend'] as const) expect(isCalmPhase(ph)).toBe(true);
    for (const ph of ['fishing', 'fishing_choice', 'shop', 'event', 'roulette', 'moving', 'node_action', 'path_selection', 'city_event', 'capital_event'] as const) {
      expect(isCalmPhase(ph)).toBe(false);
    }
  });

  it('番のはじめの保存に、あとから増えた仲間とつないだアカウントを書き足す', () => {
    const saved = { ...roster([player(0), player(1)]), turnPhase: 'idle', currentPlayerIndex: 1 } as unknown as GameState;
    const nowPlayers = [player(0, { money: 9999 }), player(1, { uid: 'u1', name: 'taro', lateLink: true, money: 7777 }), player(2, { name: 'はなこ', joinedTurn: 5 })];
    const now = roster(nowPlayers, { encyclopedias: [{ x: true }, { acct: true }, { hanako: true }] });
    const out = carryRosterIntoSave(saved, now);
    expect(out.players).toHaveLength(3);
    // いまの番の進み（お金）は戻し、つないだことと増えた仲間だけ残す
    expect(out.players[0].money).toBe(saved.players[0].money);
    expect(out.players[1]).toMatchObject({ uid: 'u1', name: 'taro', lateLink: true, money: saved.players[1].money });
    expect(out.players[2].name).toBe('はなこ');
    expect(out.encyclopedias).toEqual([{ local: true }, { acct: true }, { hanako: true }]);
    expect(out.settings.playerCount).toBe(3);
    expect(out.turnPhase).toBe('idle');
  });

  it('何も変わっていなければ保存はそのまま', () => {
    const saved = { ...roster([player(0)]), turnPhase: 'idle' } as unknown as GameState;
    expect(carryRosterIntoSave(saved, roster([player(0)]))).toBe(saved);
  });
});
