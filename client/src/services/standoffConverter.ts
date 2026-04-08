import { AnnotationData } from '../models/types';

type TiptapMark = {
  type: string;
  attrs: Record<string, any>;
};

type AllowedNodeTypes = 'doc' | 'paragraph' | 'text' | 'hardBreak';

type TiptapNode = {
  type: AllowedNodeTypes;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
};

type TiptapSchema = TiptapNode;

type ApiJson = {
  text: string;
  annotations: AnnotationData[];
};

export default class StandoffConverter {
  private annotationMap: Map<string, AnnotationData>;
  private standoffJson: ApiJson;

  constructor(newStandoffJson: ApiJson) {
    this.annotationMap = new Map<string, AnnotationData>();
    this.standoffJson = newStandoffJson;

    this.convertStandoffToTipTap();
  }

  public createIndexMap(): Map<number, Set<string>> {
    const map: Map<number, Set<string>> = new Map();

    for (let i = 0; i < this.standoffJson.text.length; i++) {
      map.set(i, new Set<string>());
    }

    this.annotationMap.values().forEach(annotation => {
      const { startIndex, endIndex, uuid } = annotation.properties;

      for (let i = startIndex; i <= endIndex; i++) {
        const existingUuids: Set<string> | undefined = map.get(i);

        existingUuids?.add(uuid);
      }
    });

    return map;
  }

  public createRuns(indexMap: Map<number, Set<string>>): TiptapNode[] {
    const runs: TiptapNode[] = [];

    let currentRun: TiptapNode | null = null;

    for (let i = 0; i < indexMap.size; i++) {
      const textAtIndex: string = this.standoffJson.text[i];
      const uuidsAtIndex: Set<string> = indexMap.get(i) ?? new Set<string>();
      const annosAtIndex: TiptapMark[] = [...uuidsAtIndex].map(uuid => {
        const annotation = this.annotationMap.get(uuid);

        const markData: TiptapMark = {
          type: 'annotation',
          attrs: {
            uuid: annotation?.properties.uuid,
            type: annotation?.properties.type,
            subType: annotation?.properties.subType ?? '',
            isZeroPoint: false,
          },
        };

        return markData;
      });

      if (i === 0) {
        currentRun = {
          type: 'text',
          text: textAtIndex,
          marks: annosAtIndex,
        };
      } else {
        const previousUuids = indexMap.get(i - 1) ?? new Set<string>();

        // If sets are same, push text to it and jump to next loop
        if (
          previousUuids.difference(uuidsAtIndex).size === 0 &&
          uuidsAtIndex.difference(previousUuids).size === 0
        ) {
          currentRun!.text += textAtIndex;

          if (i === indexMap.size - 1) {
            runs.push(currentRun as TiptapNode);
          }

          continue;
        }

        // Else, push run to array and open up new run
        runs.push(currentRun as TiptapNode);

        currentRun = {
          type: 'text',
          text: textAtIndex,
          marks: annosAtIndex,
        };
      }
    }

    return runs;
  }

  public createAnnotationUuidMap(): void {
    this.standoffJson.annotations.forEach(a => {
      this.annotationMap.set(a.properties.uuid, a as AnnotationData);
    });
  }

  public convertStandoffToTipTap(): TiptapSchema {
    const baseTree: TiptapSchema = {
      type: 'doc',
      content: [],
    };

    this.createAnnotationUuidMap();

    const indexMap: Map<number, Set<string>> = this.createIndexMap();
    const runs: TiptapNode[] = this.createRuns(indexMap);

    const tree: TiptapSchema[] = this.standoffJson.annotations
      .filter(a => a.properties.type === 'p')
      .map(a => ({
        type: 'paragraph',
        content: runs,
      }));

    baseTree.content = tree;

    // 1. Create doc structure
    // 2. Create runs from marks
    // 2.1 Set Map with key = index and value = Set<annotation uuid>

    return baseTree;
  }
}
