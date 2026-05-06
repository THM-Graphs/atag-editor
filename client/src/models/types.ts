import { IAnnotation } from './IAnnotation';
import ICharacter from './ICharacter';
import { ICollection } from './ICollection';
import { IEntity } from './IEntity';
import { IText } from './IText';

export type AdditionalText = {
  annotation: IAnnotation;
  text: TextNode;
};

/** A status object for nodes in the frontend and for API requests */
export type NodeStatusObject<
  T extends Node<BaseNodeData> = AnnotationNode | EntityNode | CollectionNode | TextNode,
> = {
  node: T;
  connectedNodes: NodeStatusObject<T>[];
  meta: {
    status: 'added' | 'removed' | 'created' | 'deleted' | 'updated' | 'unchanged';
    [key: string]: unknown;
  };
};

export type AnnotationOld = {
  characterUuids: string[];
  data: AnnotationData;
  endUuid: string;
  initialData: AnnotationData;
  isTruncated: boolean;
  startUuid: string;
  status: 'existing' | 'created' | 'deleted' | 'edited';
};

export type Annotation = NodeStatusObject<AnnotationNode>;

export type AnnotationNode = Node<IAnnotation>;

/** A node object for retrieving data */
export type NodeDto<
  T extends Node<BaseNodeData> = AnnotationNode | EntityNode | CollectionNode | TextNode,
> = {
  node: T;
  connectedNodes: NodeDto[];
};

export interface AnnotationData {
  additionalTexts: AdditionalText[];
  entities: EntityNode[];
  properties: IAnnotation;
}

export type AnnotationType = {
  category: string;
  defaultSelected: boolean;
  isSeparator?: boolean;
  isZeroPoint?: boolean;
  hasAdditionalTexts?: boolean;
  hasEntities?: boolean;
  entityNodes?: string[];
  properties?: PropertyConfig[];
  shortcut: string[];
  text: string;
  type: string;
};

export type AnnotationReference = {
  isFirstCharacter: boolean;
  isLastCharacter: boolean;
  subType: string | null;
  type: string;
  uuid: string;
};

export type AnnotationConfigEntity = {
  category: string;
  nodeLabel: string;
};

export type ApiJson = {
  text: string;
  annotations: NodeDto[];
};

export type TiptapMark = {
  type: string;
  attrs: Record<string, any>;
};

export type AllowedTiptapNodeTypes = string;

export type TiptapNode = {
  type: AllowedTiptapNodeTypes;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
};

export type TiptapJson = TiptapNode;

export type BaseNodeData = {
  uuid: string;
};

export type BaseNodeLabel = 'Annotation' | 'Character' | 'Collection' | 'Entity' | 'Text';

export type Bookmark = {
  data: CollectionNode | TextNode;
  type: 'collection' | 'text';
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
};

export type Character = {
  data: ICharacter;
  annotations: AnnotationReference[];
};

export type CharacterPostData = {
  characters: ICharacter[];
  text: string;
  textUuid: string;
  uuidEnd: string;
  uuidStart: string;
};

export type CollectionNode = Node<ICollection>;

export type CollectionAccessObject = {
  annotations: AnnotationData[];
  collection: CollectionNode;
  texts: TextNode[];
};

export type CollectionCreationData = CollectionAccessObject & {
  parentCollection: CollectionNode | null;
};

export type CollectionNetworkActionType = 'move' | 'reference' | 'dereference' | 'delete';

export type CollectionPostData = {
  data: CollectionAccessObject;
  initialData: CollectionAccessObject;
};

export type CollectionPreview = {
  collection: CollectionNode;
  nodeCounts: {
    annotations: number;
    texts: number;
    collections: number;
  };
};

export type CollectionSearchParams = {
  searchInput?: string;
  nodeLabels?: string[];
  rowCount?: number;
  sortDirection?: 'asc' | 'desc';
};

export type Command = {
  command: CommandType;
  data: CommandData;
};

export type CommandData = {
  annotation?: AnnotationOld;
  characters?: Character[];
  leftUuid?: string | null;
  rightUuid?: string | null;
  uuid?: string;
};

export type CommandType =
  | 'createAnnotation'
  | 'deleteAnnotation'
  | 'deleteText'
  | 'deleteWordAfter'
  | 'deleteWordBefore'
  | 'expandAnnotation'
  | 'insertText'
  | 'redrawAnnotation'
  | 'replaceText'
  | 'shiftAnnotationLeft'
  | 'shiftAnnotationRight'
  | 'shrinkAnnotation';

export type EntityNode = Node<IEntity>;

export type HistoryStack = HistoryRecord[];

export type HistoryRecord = {
  caretPosition: string | null;
  timestamp: Date;
  data: {
    afterEndCharacter: Character | null;
    annotations: AnnotationOld[];
    beforeStartCharacter: Character | null;
    characters: Character[];
  };
};

export type IndexMap = Map<string, { startIndex: number; endIndex: number }>;

export type CollectionStatusObject = {
  data: CollectionNode;
  status: 'existing' | 'temporary';
};

export type Level = {
  collections: CollectionStatusObject[];
  activeCollection: CollectionNode | null;
  parentUuid: string | null;
};

export type MalformedAnnotation = {
  reason: 'indexOutOfBounds' | 'unconfiguredType';
  data: StandoffAnnotation;
};

export type NetworkPostData = {
  type: CollectionNetworkActionType;
  nodes: (CollectionNode | TextNode)[];
  origin: CollectionNode | null;
  target: CollectionNode | null;
};

export type Node<T = AnnotationNode | CollectionNode | EntityNode | TextNode> = {
  data: T;
  nodeLabels: string[];
};

export type NodeAncestry = (TextNode | CollectionNode | IAnnotation)[];

export type PaginationData = {
  limit: number;
  order: string;
  search: string;
  totalRecords: number;
  nextCursor: CursorData | null;
};

export type CursorData = {
  label: string;
  uuid: string;
};

export type PaginationResult<T> = {
  data: T;
  pagination: PaginationData;
};

export type PropertyConfig = {
  name: string /* folioEnd, label, websiteUrl */;
  type: PropertyConfigDataType /* raw string, dropdown, multiple options */;
  required: boolean /* required or optional */;
  editable: boolean /* Editable by user */;
  visible: boolean /* Visible by user */;
  /* Only relevant if type is "array" */
  items?: Partial<PropertyConfig>;
  minItems?: number;
  maxItems?: number;
  /* Only relevant if type is "number"/"integer" */
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  /* Only relevant if type is "string" */
  minLength?: number;
  maxLength?: number;
  options?: string[] | number[] /* Options if type is dropdown */;
  template?: PropertyConfigStringTemplate /* Render as normal input or textarea? */;
};

export type PropertyConfigDataType =
  | 'array'
  | 'boolean'
  | 'date'
  | 'date-time'
  | 'integer'
  | 'number'
  | 'string'
  | 'time';

export type PropertyConfigStringTemplate = 'input' | 'textarea';

export type RedrawModeOptions = {
  direction: 'on' | 'off';
  cause?: 'success' | 'cancel';
  annotationUuid?: string;
};

export type StandoffAnnotation = {
  [key: string]: any;
  startIndex: number;
  endIndex: number;
  text: string;
  type: string;
  subType?: string | number;
};

export type StandoffJson = {
  annotations: StandoffAnnotation[];
  text: string;
};

export type TextNode = Node<IText>;

export type TextAccessObject = {
  collection: CollectionNode | null;
  paths: NodeAncestry[];
  text: TextNode;
};

export type TextOperationResult = {
  leftBoundary?: string | null;
  rightBoundary?: string | null;
  changeSet?: Character[];
};
