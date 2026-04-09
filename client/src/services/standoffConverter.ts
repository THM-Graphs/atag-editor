import { AnnotationData, ApiJson, TiptapMark, TiptapNode, TiptapJson } from '../models/types';

export default class StandoffConverter {
  private annotationUuidMap: Map<string, AnnotationData>;
  private standoffJson: ApiJson;
  private indexMap: Map<number, Set<string>> = new Map<number, Set<string>>();
  private runs: TiptapNode[] = [];
  // TODO: This should come from guidelines, config etc.
  private structuralAnnotationTypes: Set<string> = new Set([
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ]);

  constructor(newStandoffJson: ApiJson) {
    this.annotationUuidMap = new Map<string, AnnotationData>();
    this.standoffJson = newStandoffJson;

    this.convertStandoffToTipTap();
  }

  public createIndexMap(): void {
    const map: Map<number, Set<string>> = new Map();

    for (let i = 0; i < this.standoffJson.text.length; i++) {
      map.set(i, new Set<string>());
    }

    this.annotationUuidMap.values().forEach(annotation => {
      const { startIndex, endIndex, uuid, type } = annotation.properties;

      // The index map is only for non-structural annotations,
      // as structural annotations will be represented as nodes in the tree, not marks on text
      if (this.structuralAnnotationTypes.has(type)) {
        return;
      }

      for (let i = startIndex; i <= endIndex; i++) {
        const existingUuids: Set<string> | undefined = map.get(i);

        existingUuids?.add(uuid);
      }
    });

    this.indexMap = map;
  }

  public createRuns(): void {
    const runs: TiptapNode[] = [];

    let currentRun: TiptapNode | null = null;

    for (let i = 0; i < this.indexMap.size; i++) {
      const textAtIndex: string = this.standoffJson.text[i];
      const uuidsAtIndex: Set<string> = this.indexMap.get(i) ?? new Set<string>();
      const annosAtIndex: TiptapMark[] = [...uuidsAtIndex].map(uuid => {
        const annotation = this.annotationUuidMap.get(uuid);

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
        const previousUuids = this.indexMap.get(i - 1) ?? new Set<string>();

        // If sets are same, push text to it and jump to next loop
        if (
          previousUuids.difference(uuidsAtIndex).size === 0 &&
          uuidsAtIndex.difference(previousUuids).size === 0
        ) {
          currentRun!.text += textAtIndex;

          if (i === this.indexMap.size - 1) {
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

    this.runs = runs;
  }

  public createAnnotationUuidMap(): void {
    this.standoffJson.annotations.forEach(a => {
      this.annotationUuidMap.set(a.properties.uuid, a as AnnotationData);
    });
  }

  public convertStandoffToTipTap(): TiptapJson {
    const baseTree: TiptapJson = {
      type: 'doc',
      content: [],
    };

    this.createAnnotationUuidMap();
    this.createIndexMap();

    this.createRuns();

    const tree: TiptapJson[] = this.standoffJson.annotations
      .filter(a => a.properties.type === 'p')
      .map(a => ({
        type: 'paragraph',
        content: this.runs,
      }));

    baseTree.content = tree;

    // 1. Create doc structure
    // 2. Create runs from marks
    // 2.1 Set Map with key = index and value = Set<annotation uuid>

    return baseTree;
  }
}
