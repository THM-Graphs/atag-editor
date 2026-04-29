import {
  AnnotationData,
  ApiJson,
  TiptapMark,
  TiptapNode,
  TiptapJson,
  AnnotationType,
} from '../models/types';
import { useGuidelinesStore } from '../store/guidelines';

type TreeNode = {
  content: string;
  children: TreeNode[];
};

const { structuralAnnotationConfigs, getStructuralAnnotationConfig } = useGuidelinesStore();

export default class StandoffConverter {
  private annotations: Map<string, AnnotationData> = new Map<string, AnnotationData>();
  private structuralAnnotations: Map<string, AnnotationData> = new Map<string, AnnotationData>();
  private standoffJson: ApiJson;
  private indexMap: Map<number, Set<string>> = new Map<number, Set<string>>();
  // private runs: TiptapNode[] = [];
  private tiptapJson: TiptapJson | null = null;
  private structuralAnnotationConfigs: AnnotationType[] = [];
  private structuralAnnotationTypes: Set<string> = new Set<string>();

  constructor(newStandoffJson: ApiJson) {
    this.standoffJson = newStandoffJson;
    this.structuralAnnotationConfigs = structuralAnnotationConfigs;
    this.structuralAnnotationTypes = new Set<string>(
      this.structuralAnnotationConfigs.map(c => c.type),
    );

    this.convertStandoffToTipTap();
  }

  public getData(): {
    annotations: Map<string, AnnotationData>;
    structuralAnnotations: Map<string, AnnotationData>;
    tipTapJson: TiptapJson;
  } {
    return {
      annotations: this.annotations,
      structuralAnnotations: this.structuralAnnotations,
      tipTapJson: this.tiptapJson as TiptapJson,
    };
  }

  private createIndexMap(): void {
    const map: Map<number, Set<string>> = new Map();

    for (let i = 0; i < this.standoffJson.text.length; i++) {
      map.set(i, new Set<string>());
    }

    this.annotations.values().forEach(annotation => {
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

  private createRunsForBlock(startIndex: number, endIndex: number): TiptapNode[] {
    const runs: TiptapNode[] = [];

    let isFirstRun: boolean = true;
    let currentRun: TiptapNode | null = null;

    currentRun = {
      type: 'text',
      text: '',
      marks: [],
    };

    for (let i = startIndex; i <= endIndex; i++) {
      const textAtIndex: string = this.standoffJson.text[i];
      const uuidsAtIndex: Set<string> = this.indexMap.get(i) ?? new Set<string>();
      const annosAtIndex: TiptapMark[] = [...uuidsAtIndex].map(uuid => {
        const annotation = this.annotations.get(uuid);

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

      const previousUuids = this.indexMap.get(i - 1) ?? new Set<string>();

      if (isFirstRun) {
        currentRun.text += textAtIndex;
        currentRun.marks = annosAtIndex;

        isFirstRun = false;
      } else {
        // If sets are same, just push text to it and jump to next loop
        if (
          previousUuids.difference(uuidsAtIndex).size === 0 &&
          uuidsAtIndex.difference(previousUuids).size === 0 &&
          !isFirstRun
        ) {
          currentRun!.text += textAtIndex;

          // if (i === endIndex - 1) {
          //   runs.push(currentRun as TiptapNode);
          // }

          continue;
        } else {
          // If sets are different, push current run to array and open up new run
          runs.push(currentRun as TiptapNode);

          currentRun = {
            type: 'text',
            text: textAtIndex,
            marks: annosAtIndex,
          };
        }
      }
    }

    // Close and push run after the last loops has run
    runs.push(currentRun as TiptapNode);

    return [
      {
        type: 'text',
        text: this.standoffJson.text.slice(startIndex, endIndex + 1),
        marks: [],
      },
    ];

    return runs;
  }

  private createAnnotationUuidMaps(): void {
    this.standoffJson.annotations.forEach(a => {
      if (this.structuralAnnotationTypes.has(a.properties.type)) {
        this.structuralAnnotations.set(a.properties.uuid, a as AnnotationData);
      } else {
        this.annotations.set(a.properties.uuid, a as AnnotationData);
      }
    });
  }

  private getChildren(startIndex: number, endIndex: number): AnnotationData[] {
    const annotationsBetween: AnnotationData[] = this.standoffJson.annotations.filter(a => {
      a.properties.startIndex >= startIndex && a.properties.endIndex <= endIndex;
    });

    return annotationsBetween;
  }

  private getOrderedChildren(
    startIndex: number,
    endIndex: number,
    annotations: AnnotationData[],
  ): AnnotationData[] {
    // const childrenAnnotations: AnnotationData[] = this.getChildren(startIndex, endIndex);
    const orderedList: AnnotationData[] = [];

    const first = annotations.find(a => a.properties.startIndex === startIndex);

    if (!first) {
      return orderedList;
    }

    orderedList.push(first);

    let currentEndIndex: number = first.properties.endIndex;

    // Loop until end is reached
    while (currentEndIndex <= endIndex) {
      const anno = annotations.find(a => a.properties.startIndex === currentEndIndex + 1);

      if (!anno) {
        break;
      }

      // Push to list
      orderedList.push(anno);

      // Set new boundary
      currentEndIndex = anno.properties.endIndex;
    }

    return orderedList;
  }

  private walkTree(
    startIndex: number,
    endIndex: number,
    annotations: AnnotationData[],
    parentUuid?: string,
  ): TreeNode {
    const content: string = this.standoffJson.text.slice(startIndex, endIndex + 1);

    // Get direct children within this range, excluding the parent itself
    let children: AnnotationData[] = this.getOrderedChildren(
      startIndex,
      endIndex,
      annotations,
    ).filter(a => (parentUuid ? a.properties.uuid !== parentUuid : true));

    return {
      content,
      children: children.map(ch => {
        // Get annotations nested inside this child's range
        const nestedAnnotations = annotations.filter(
          a =>
            a.properties.uuid !== ch.properties.uuid &&
            a.properties.startIndex >= ch.properties.startIndex &&
            a.properties.endIndex <= ch.properties.endIndex,
        );

        return this.walkTree(
          ch.properties.startIndex,
          ch.properties.endIndex,
          nestedAnnotations, // ✅ scoped to this child's range
          ch.properties.uuid, // ✅ exclude the child itself in next level
        );
      }),
    };
  }

  public convertStandoffToTipTap(): void {
    const textLength = this.standoffJson.text.length;
    const annotations = this.standoffJson.annotations.filter(
      a => a.properties.type === 'paragraph',
    );

    const nodeTree: TreeNode = this.walkTree(0, textLength - 1, annotations);

    // console.log(nodeTree);

    // console.log(nodeTree);

    let baseTree: TiptapJson = {
      type: 'doc',
      content: [],
    };

    this.createAnnotationUuidMaps();
    this.createIndexMap();

    // this.createRunsForBlock();

    const tree: TiptapJson[] = this.standoffJson.annotations
      .filter(a => a.properties.type === 'paragraph')
      .map(a => {
        const runs = this.createRunsForBlock(a.properties.startIndex, a.properties.endIndex);

        let nodeAttrs: Record<string, any> = {};
        const config: AnnotationType | undefined = getStructuralAnnotationConfig(a.properties.type);

        if (config) {
          config.properties?.forEach(field => {
            nodeAttrs[field.name] = a.properties[field.name];
          });
        }

        return {
          type: 'paragraph',
          content: runs,
          attrs: {
            uuid: a.properties.uuid,
            ...nodeAttrs,
          },
        };
      });

    baseTree.content = tree;

    // 1. Create doc structure
    // 2. Create runs from marks
    // 2.1 Set Map with key = index and value = Set<annotation uuid>

    this.tiptapJson = baseTree;
  }
}
