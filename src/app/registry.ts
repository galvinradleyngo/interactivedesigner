import type { ComponentType } from 'react';
import type { ActivityTypeDef } from '../plugins/types';
import type { ActivityDoc } from '../schema/types';
import { multipleChoiceType } from '../plugins/multipleChoice/type';
import { MultipleChoiceEditor } from '../plugins/multipleChoice/Editor';

export interface EditorProps<C = unknown> {
  content: C;
  onChange(content: C): void;
  doc: ActivityDoc<C>;
  /** Add an image to the activity's media library; resolves to a `media:<id>` ref. */
  addImage(file: File): Promise<string>;
}

export interface EditorPlugin {
  def: ActivityTypeDef<never, never>;
  Editor: ComponentType<EditorProps<never>>;
}

export const editorPlugins: EditorPlugin[] = [
  {
    def: multipleChoiceType as unknown as ActivityTypeDef<never, never>,
    Editor: MultipleChoiceEditor as unknown as ComponentType<EditorProps<never>>,
  },
];

export const getEditorPlugin = (type: string) => editorPlugins.find((p) => p.def.type === type);
