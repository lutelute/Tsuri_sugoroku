// まちづくり: データマップの種類
export type DataMapMode = 'none' | 'pop' | 'power' | 'pollution' | 'happy';

export const DATA_MAP_LABEL: Record<DataMapMode, string> = {
  none: 'データ表示なし',
  pop: '人口',
  power: '電力網',
  pollution: '公害',
  happy: '幸福度',
};


