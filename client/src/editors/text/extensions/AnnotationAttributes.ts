import { Attribute, Extension, GlobalAttributes } from '@tiptap/vue-3';
import { getDefaultValueForProperty } from '../../../utils/helper/helper';
import { AnnotationType, PropertyConfig } from '../../../models/types';
import { useGuidelinesStore } from '../../../store/guidelines';
import { Node } from '@tiptap/pm/model';

const { structuralAnnotationConfigs } = useGuidelinesStore();

// Built-in structural tiptap node types. For these, the tiptap node type name == the neo4j type.
// Custom types all use 'customBlock' as tiptap nodeType regardless of their neo4j type name.
const BUILTIN_STRUCTURAL_NODE_TYPES = [
  'paragraph',
  'heading',
  'hardBreak',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
  'bulletList',
  'listItem',
] as const;

type BuiltinNodeType = (typeof BUILTIN_STRUCTURAL_NODE_TYPES)[number];

// Returns { _type, _annotationData, _annotations } attributes.
// _type: stores the actual neo4j/semantic type (e.g. 'paragraph', 'address').
//   Default = typeName for built-ins (new nodes already know their type),
//   null for customBlock (always set explicitly via wrapIn attrs).
// _annotationData: full neo4j round-trip payload; default = { type } for built-ins, null for customBlock.
// _annotations: custom TEI structural annotations (closer, address, …) that wrap this node's range,
//   stored as an array of full annotation data objects sorted outermost-first. null when none.
function makeDataAttr(defaultType: string | null): Record<string, Attribute> {
  return {
    _type: {
      default: defaultType,
      renderHTML: () => {
        return { 'data-annotation-type': defaultType };
      },
    },
    _annotationData: {
      default: defaultType !== null ? { type: defaultType } : null,
      rendered: false,
    },
    _annotations: {
      default: null,
      rendered: false,
    },
  };
}

function propertiesToAttributes(config: AnnotationType): Record<string, Attribute> {
  let nodeAttrs: Record<string, Attribute> = {};

  (config?.properties ?? []).forEach((field: PropertyConfig) => {
    const defaultValue: any =
      field.required === true ? getDefaultValueForProperty(field.type) : null;

    const htmlDataKey: string = `data-${[field.name]}`;

    nodeAttrs[field.name] = {
      default: defaultValue,
      parseHTML: (el: HTMLElement) => el.getAttribute(field.name),
      renderHTML: attrs => ({ [htmlDataKey]: attrs[field.name] }),
    };
  });

  return nodeAttrs;
}

/**
 * On every doc change, the `_type` property from the tiptap node must be transferred to `_annotationData.type`
 * since these are the actual neo4j node data. Is done on save too, but for ToC etc. this is useful
 *
 * @param {Node} doc - The doc root
 */
function transferTiptapTypeToAnnotationType(doc: Node) {
  doc.forEach(node => {
    if (node.isBlock) {
      node.attrs._annotationData.type = node.attrs._type;
    }
  });
}

/**
 * Adds `_type`, `_annotationData`, and per-property attributes to all structural node types.
 *
 * Built-in types (paragraph, heading, ...) use their own tiptap node type name, get
 * per-property attributes from the guidelines config, and get `_type` defaulting to their
 * type name so freshly created nodes are usable without a neo4j round-trip.
 *
 * Custom types (address, addrLine, closer, ...) all share the 'customBlock' tiptap node type.
 * Their per-property data lives in `_annotationData`; `_type` is set explicitly when the
 * node is created via the `wrapIn` command and is here null by default (`customBlock` does not know its type).
 */
export const AnnotationAttributes = Extension.create({
  name: 'annotationAttributes',

  onUpdate({ editor }) {
    transferTiptapTypeToAnnotationType(editor.state.doc);
  },

  addGlobalAttributes() {
    const builtinAttrs: GlobalAttributes = BUILTIN_STRUCTURAL_NODE_TYPES.map(typeName => {
      const config = structuralAnnotationConfigs.value.find(
        (c: AnnotationType) => c.type === typeName,
      );

      return {
        types: [typeName as BuiltinNodeType],
        attributes: {
          ...(config ? propertiesToAttributes(config) : {}),
          ...makeDataAttr(typeName),
        },
      };
    });

    // All custom (non-built-in) types use 'customBlock'. Their properties are stored in
    // _annotationData rather than as separate tiptap attrs to avoid schema conflicts.
    const customBlockAttrs: GlobalAttributes = [
      {
        types: ['customBlock'],
        attributes: makeDataAttr(null),
      },
    ];

    return [...builtinAttrs, ...customBlockAttrs];
  },
});
