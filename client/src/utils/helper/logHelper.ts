import { IndexMap } from '../../models/types';

export function logMap(plainText: string, heading: string, map: IndexMap) {
  console.log(`%c${heading}`, 'font-weight: bold; font-size: 18px;');

  [...map.values()].forEach(indexSet => {
    const slice = plainText.slice(indexSet.startIndex, indexSet.endIndex + 1);
    console.log(indexSet.startIndex, indexSet.endIndex, slice);
  });
}

export function logSetDiffs(set1: Set<any>, set2: Set<any>): void {
  const diff1 = set1.difference(set2);
  const diff2 = set2.difference(set1);
  console.log('Only set 1:', diff1);
  console.log('Only set 2:', diff2);
}
