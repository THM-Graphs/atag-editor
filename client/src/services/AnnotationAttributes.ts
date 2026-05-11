import { Attribute, Extension, GlobalAttributes } from '@tiptap/vue-3';
import { useGuidelinesStore } from '../store/guidelines';
import { AnnotationType, PropertyConfig } from '../models/types';
import { getDefaultValueForProperty } from '../utils/helper/helper';

const { structuralAnnotationConfigs } = useGuidelinesStore();

function createCustomAttributes(): GlobalAttributes {
  return structuralAnnotationConfigs.map((config: AnnotationType) => ({
    types: [config.type],
    attributes: propertiesToAttributes(config),
  }));
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

  // TODO: Currently hardcoded, think about better solution...
  nodeAttrs.type = {
    isRequired: false,
    parseHTML: (el: HTMLElement) => el.getAttribute('type'),
    renderHTML: attrs => ({ type: attrs.type }),
  };

  return nodeAttrs;
}

/**
 * Extension for handling attributes applied to structural annotations. These are derived from the default configuration.
 */
export const AnnotationAttributes = Extension.create({
  name: 'annotationAttributes',

  addGlobalAttributes() {
    return createCustomAttributes();
  },
});
