import { Node, Schema } from '@tiptap/pm/model';
import { Step, StepResult, Mapping } from '@tiptap/pm/transform';
import { AnnotationNode } from '../../../models/types';
import { AddAnnotationStep } from './addAnnotationStep';

/**
 * A custom ProseMirror step that signals the `annotationDecoration` plugin to remove a decoration.
 *
 * It does not modify the document — it exists solely as a data carrier. The reason for this
 * indirection is that ProseMirror's history plugin only records `tr.steps`, not plugin state.
 * By placing the annotation data into an actual step, the history plugin records it and calls
 * `invert()` on undo, producing an {@link AddAnnotationStep} that the plugin then acts on.
 */
export class RemoveAnnotationStep extends Step {
  constructor(
    readonly annotation: AnnotationNode,
    readonly from: number,
    readonly to: number,
  ) {
    super();
  }

  apply(doc: Node): StepResult {
    //Returns the original document since it is not touched at all.
    return StepResult.ok(doc);
  }

  invert(): AddAnnotationStep {
    // Returns the opposite step
    return new AddAnnotationStep(this.annotation, this.from, this.to);
  }

  map(mapping: Mapping): RemoveAnnotationStep {
    const from: number = mapping.map(this.from);
    const to: number = mapping.map(this.to);

    return new RemoveAnnotationStep(this.annotation, from, to);
  }

  toJSON() {
    // Kept for consistency, not really needed (JSON serialization is only relevant during collaboration when
    // steps need to be sent over the network). Here, everything is kept in memory anyway.
    return {
      stepType: 'removeAnnotation',
      annotation: this.annotation,
      from: this.from,
      to: this.to,
    };
  }

  static fromJSON(_schema: Schema, json: any): RemoveAnnotationStep {
    // Kept for consistency, not really needed (JSON serialization is only relevant during collaboration when
    // steps need to be sent over the network). Here, everything is kept in memory anyway.
    return new RemoveAnnotationStep(json.annotation, json.from, json.to);
  }
}
