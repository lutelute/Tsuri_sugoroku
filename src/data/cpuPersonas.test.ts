import { describe, it, expect } from 'vitest';
import {
  CPU_LINES, CPU_LINE_MAX, CPU_PERSONAS, CPU_SCENES, cpuLine, cpuPersonaFor, personaOf, withCpuLine,
  cpuQuote, firstCpuQuote, disasterQuote, splitCpuLine,
} from './cpuPersonas';
import { CPU_STYLES } from '../game/cpuAI';
import { toRubySegments } from './furigana';

const KANJI = /[㐀-䶿一-鿿々]/;
const unread = (text: string) => toRubySegments(text).filter(s => !s.r && KANJI.test(s.t)).map(s => `${s.t}（${text}）`);

describe('CPU の人物', () => {
  it('性格ごとに人物がいて、名前と印は重ならない', () => {
    const all = CPU_STYLES.flatMap(s => CPU_PERSONAS[s]);
    expect(CPU_STYLES.every(s => CPU_PERSONAS[s].length >= 2)).toBe(true);
    expect(new Set(all.map(p => p.name)).size).toBe(all.length);
    expect(new Set(all.map(p => p.mark)).size).toBe(all.length);
    expect(new Set(all.map(p => p.id)).size).toBe(all.length);
    for (const p of all) {
      expect(p.mark).toHaveLength(1);
      expect(p.name).toContain(p.mark); // 印は名前の一文字
    }
  });

  it('1人目は お松・権蔵・早太。同じ性格の2人目は別の名前', () => {
    expect(cpuPersonaFor('steady').name).toBe('お松');
    expect(cpuPersonaFor('monopoly').name).toBe('権蔵');
    expect(cpuPersonaFor('racer').name).toBe('早太');
    expect(cpuPersonaFor('steady', 1).name).not.toBe('お松');
    // 用意した人数を超えても名前が重ならない
    const names = [0, 1, 2, 3, 4].map(n => cpuPersonaFor('steady', n).name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('プレイヤーから人物を引ける（人は null。名前が違えばその性格の1人目）', () => {
    expect(personaOf({ isCpu: true, cpuStyle: 'monopoly', name: '権蔵' })?.mark).toBe('権');
    expect(personaOf({ isCpu: true, cpuStyle: 'steady', name: 'お梅' })?.mark).toBe('梅');
    expect(personaOf({ isCpu: true, cpuStyle: 'racer', name: 'CPU・目的地' })?.mark).toBe('早');
    expect(personaOf({ isCpu: false, name: 'たろう' })).toBeNull();
    expect(personaOf(undefined)).toBeNull();
  });

  it('名前と肩書きの漢字にふりがなが振られる', () => {
    const all = CPU_STYLES.flatMap(s => CPU_PERSONAS[s]);
    expect(all.flatMap(p => [...unread(p.name), ...unread(p.role)])).toEqual([]);
  });
});

describe('CPU のせりふ', () => {
  const lines = CPU_STYLES.flatMap(style => CPU_SCENES.flatMap(scene => CPU_LINES[style][scene].map(text => ({ style, scene, text }))));

  it('3人 × 14場面 × 2つ', () => {
    expect(lines).toHaveLength(3 * 14 * 2);
    for (const style of CPU_STYLES) {
      for (const scene of CPU_SCENES) expect(CPU_LINES[style][scene][0]).not.toBe(CPU_LINES[style][scene][1]);
    }
  });

  it('1行24字まで', () => {
    const long = lines.filter(l => l.text.length > CPU_LINE_MAX).map(l => `${l.text}（${l.text.length}字）`);
    expect(long).toEqual([]);
  });

  it('漢字にはすべてふりがなが振られる', () => {
    expect(lines.flatMap(l => unread(l.text))).toEqual([]);
  });

  it('せりふに自分の名前を入れない（同じ性格の2人目も同じせりふを使うため）', () => {
    const names = CPU_STYLES.flatMap(s => CPU_PERSONAS[s].map(p => p.name));
    expect(lines.filter(l => names.some(n => l.text.includes(n)))).toEqual([]);
  });

  it('seed の偶奇で言い回しが替わり、人には付かない', () => {
    const cpu = { isCpu: true, cpuStyle: 'monopoly' as const, name: '権蔵' };
    expect(cpuLine(cpu, 'build', 0)).toBe(CPU_LINES.monopoly.build[0]);
    expect(cpuLine(cpu, 'build', 1)).toBe(CPU_LINES.monopoly.build[1]);
    expect(cpuLine(cpu, 'build', 2)).toBe(CPU_LINES.monopoly.build[0]);
    expect(cpuLine({ isCpu: false, name: 'たろう' }, 'build', 0)).toBeNull();
  });

  it('お知らせの本文の頭にせりふを足す（人は本文のまま）', () => {
    const cpu = { isCpu: true, cpuStyle: 'steady' as const, name: 'お松' };
    expect(withCpuLine(cpu, 'build', '金沢に住宅地を建てた', 0)).toBe(`「${CPU_LINES.steady.build[0]}」金沢に住宅地を建てた`);
    expect(withCpuLine({ isCpu: false, name: 'たろう' }, 'build', '金沢に住宅地を建てた')).toBe('金沢に住宅地を建てた');
  });
});

describe('名前つきのひとこと・せりふの切り分け', () => {
  const human = { isCpu: false, name: 'たろう' };
  const omatsu = { isCpu: true, cpuStyle: 'steady' as const, name: 'お松' };
  const gonzo = { isCpu: true, cpuStyle: 'monopoly' as const, name: '権蔵' };

  it('名前つきのひとことは「名前「せりふ」」。人は空文字', () => {
    expect(cpuQuote(gonzo, 'destination_lost', 0)).toBe(`権蔵「${CPU_LINES.monopoly.destination_lost[0]}」`);
    expect(cpuQuote(human, 'destination_lost', 0)).toBe('');
    expect(cpuQuote(undefined, 'disaster')).toBe('');
  });

  it('並びの中で最初の CPU が言う（人は飛ばす）', () => {
    expect(firstCpuQuote([human, gonzo, omatsu], 'binbo_pass', 1)).toBe(`権蔵「${CPU_LINES.monopoly.binbo_pass[1]}」`);
    expect(firstCpuQuote([human], 'binbo_pass')).toBe('');
    expect(firstCpuQuote([], 'binbo_pass')).toBe('');
  });

  it('災害のひとことは、被害の多い CPU が言う（人の被害だけなら空文字）', () => {
    const players = [human, omatsu, gonzo];
    expect(disasterQuote(players, [0, 1, 2, 2], 0)).toBe(`権蔵「${CPU_LINES.monopoly.disaster[0]}」`);
    expect(disasterQuote(players, [0, 0, 1], 0)).toBe(`お松「${CPU_LINES.steady.disaster[0]}」`); // いちばん多いのは人。次に多い CPU
    expect(disasterQuote(players, [1, 2], 0)).toBe(`お松「${CPU_LINES.steady.disaster[0]}」`); // 同じ数なら先の席
    expect(disasterQuote(players, [0, 0], 0)).toBe('');
    expect(disasterQuote(players, [], 0)).toBe('');
  });

  it('本文の頭のせりふを切り分ける（名前つきも）。せりふでない「…」は切らない', () => {
    const line = CPU_LINES.racer.build[0];
    expect(splitCpuLine(`「${line}」金沢に住宅地を建てた`)).toEqual({ head: `「${line}」`, text: '金沢に住宅地を建てた' });
    expect(splitCpuLine(`早太「${line}」金沢に住宅地を建てた`)).toEqual({ head: `早太「${line}」`, text: '金沢に住宅地を建てた' });
    expect(splitCpuLine('金沢に住宅地を建てた')).toEqual({ head: '', text: '金沢に住宅地を建てた' });
    expect(splitCpuLine('「今年、建物を5軒建てる」賞金 ¥4,500')).toEqual({ head: '', text: '「今年、建物を5軒建てる」賞金 ¥4,500' });
    expect(splitCpuLine('名産「うなぎの蒲焼き」を手に入れた').head).toBe('');
    // withCpuLine・cpuQuote で足したものは、どの場面のせりふでも切り分けられる
    for (const scene of CPU_SCENES) {
      expect(splitCpuLine(withCpuLine(gonzo, scene, '本文', 1)).text).toBe('本文');
      expect(splitCpuLine(`${cpuQuote(gonzo, scene, 0)}本文`).text).toBe('本文');
    }
  });
});
