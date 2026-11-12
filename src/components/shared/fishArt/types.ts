import type { FishBodyShape } from '../../../game/types';
import type { FormId } from './forms';

/** 体の模様。x0/x1 は体の長さに対する割合（0=口・1=尾の付け根）、rel は背(0)〜腹(1)の割合 */
export type Mark =
  /** 縦の帯（イシダイ・イサキの幼魚） */
  | { k: 'bands'; n: number; col: string; w?: number; slant?: number; x0?: number; x1?: number; op?: number }
  /** 横の線（ブリの黄色い線・イサキの縞） */
  | { k: 'stripe'; rel: number; col: string; w?: number; x0?: number; x1?: number; op?: number }
  /** 点（y0/y1 で背〜腹の範囲） */
  | { k: 'spots'; n: number; col: string; r?: [number, number]; y0?: number; y1?: number; x0?: number; x1?: number; op?: number }
  /** まだら（カサゴ・ハタ） */
  | { k: 'mottle'; n: number; col: string; size?: number; x0?: number; x1?: number; op?: number }
  /** 背の虫食い模様（サバ）。to は下端の割合 */
  | { k: 'mushikui'; col: string; to?: number; x0?: number; x1?: number; op?: number }
  /** パーマーク（ヤマメ・アマゴ） */
  | { k: 'parr'; n: number; col: string; x0?: number; x1?: number; op?: number }
  /** 目玉のような斑（マトウダイ・トラフグ） */
  | { k: 'eyespot'; x: number; rel: number; r: number; col: string; ring?: string; op?: number; x0?: number; x1?: number }
  /** 色のにじみ（アユの黄色い斑・ニジマスの頬） */
  | { k: 'patch'; x: number; rel: number; rx: number; ry: number; col: string; op?: number; x0?: number; x1?: number }
  /** 斜めの帯（タカノハダイ） */
  | { k: 'diag'; n: number; col: string; w?: number; x0?: number; x1?: number; op?: number }
  /** 稜鱗（アジのぜいご） */
  | { k: 'scutes'; col: string; op?: number; x0?: number; x1?: number }
  /** 針（ハリセンボン） */
  | { k: 'prickles'; col: string; op?: number; x0?: number; x1?: number };

/** 魚ごとの絵の指定 */
export interface FishFormEntry {
  form: FormId;
  marks?: Mark[];
  /** 色を魚の基本色から作らずに決める */
  col?: Partial<{ back: string; mid: string; belly: string; fin: string; edge: string; finlet: string }>;
  /** ひれの色 */
  fin?: string;
  /** 目の大きさの倍率 */
  eye?: number;
  /** 目の色（木版の金の代わり） */
  iris?: string;
  /** 体の高さの倍率（1 で型のまま） */
  stretch?: number;
}

/** 型に当てはめず、今の絵（もとの絵）で描く物 */
export interface LegacyEntry { legacy: FishBodyShape }
