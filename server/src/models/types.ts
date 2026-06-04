import { IAnnotation } from './IAnnotation.js';
import ICharacter from './ICharacter.js';
import { ICollection } from './ICollection.js';
import { IEntity } from './IEntity.js';
import { IText } from './IText.js';

export type AdditionalText = {
  annotation: IAnnotation;
  text: TextNode;
};

export type Annotation = {
  characterUuids: string[];
  data: AnnotationData;
  endUuid: string;
  initialData: AnnotationData;
  isTruncated: boolean;
  startUuid: string;
  status: 'existing' | 'created' | 'deleted' | 'edited';
};

export type AnnotationNode = Node<IAnnotation>;

export interface AnnotationData {
  additionalTexts: AdditionalText[];
  entities: EntityNode[];
  properties: IAnnotation;
}

/** A node object for retrieving data */
export type NodeDto<
  T extends Node<BaseNodeData> = AnnotationNode | EntityNode | CollectionNode | TextNode,
> = {
  node: T;
  connectedNodes: NodeDto[];
};

/**
 * A status field for nodes in the frontend and for API requests. Is accessed during editing
 * (to display the current edit state) and before saving to tell the backend how to process the data.
 */
export type NodeStatus = 'added' | 'removed' | 'created' | 'deleted' | 'modified' | 'unchanged';

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

/** Base node labels in RAMEN */
export type BaseNodeLabel = 'Annotation' | 'Character' | 'Collection' | 'Entity' | 'Content';

export type BaseNodeData = {
  uuid: string;
};

/** Relationship types in RAMEN */
export type BaseRelationshipType = 'HAS_ANNOTATION' | 'PART_OF' | 'REFERS_TO';

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

export type CollectionNetworkActionType = 'move' | 'reference' | 'dereference' | 'delete';

export type CollectionCreationData = CollectionAccessObject & {
  parentCollection: CollectionNode | null;
};

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

/** Object for specifying relationship between two nodes. Used during preprocessing data before updating Text nodes */
export type EdgeDescriptor = {
  type: BaseRelationshipType;
  startUuid: string;
  endUuid: string;
};

export type EntityNode = Node<IEntity>;

export type FaviconResponse = {
  contentType: string;
  data: Buffer;
};

export type MalformedAnnotation = {
  reason: 'indexOutOfBounds' | 'unconfiguredType';
  data: StandoffAnnotation;
};

export type Node<T = AnnotationNode | CollectionNode | EntityNode | TextNode> = {
  data: T;
  nodeLabels: string[];
};

export type NetworkPostData = {
  type: CollectionNetworkActionType;
  nodes: (CollectionNode | TextNode)[];
  origin: CollectionNode | null;
  target: CollectionNode | null;
};

export type NodeAncestry = (TextNode | CollectionNode | IAnnotation)[];

export type NodeSearchParams = {
  nodeLabels?: string[];
  order?: 'asc' | 'desc';
  offset?: number;
  limit?: number;
  search?: string;
};

/** A status object for incoming API requests that should update a subgraph */
export type NodeStatusObject<
  T extends Node<BaseNodeData> = AnnotationNode | EntityNode | CollectionNode | TextNode,
> = {
  node: T;
  connectedNodes: NodeStatusObject<T>[];
  meta: {
    status: NodeStatus;
    [key: string]: unknown;
  };
};

export type PaginationData = {
  limit: number;
  offset?: number | null;
  order: string;
  search: string;
  totalRecords: number;
  nextCursor?: CursorData | null;
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

export type StandoffAnnotation = {
  [key: string]: string | number | boolean;
  start: number;
  end: number;
  text: string;
  type: string;
};

export type StandoffJson = {
  annotations: StandoffAnnotation[];
  text: string;
};

export type TextNode = Node<IText>;
// TODO: Remove TextNode (or remove IText) -> ContentNode will be default
export type ContentNode = Node<IText>;

export type NodeUpdateObject = {
  create: Node<Record<string, any>>[];
  update: Node<Record<string, any>>[];
  delete: (AnnotationNode | CollectionNode | EntityNode | TextNode | Node<Record<string, any>>)[];
  remove: { type: string; startUuid: string; endUuid: string }[];
  attach: { type: string; startUuid: string; endUuid: string }[];
};

/**
 * Type for updating text + annotations.
 */
export type TextUpdateDto = {
  text: NodeStatusObject<TextNode>;
  annotations: NodeStatusObject[];
};

export type TextAccessObject = {
  collection: CollectionNode | null;
  paths: NodeAncestry[];
  text: TextNode;
};
