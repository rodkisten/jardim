# Studio blocks

Visual mode supports slash insertion at the start of a text block, manual searchable insertion, keyboard navigation, attachment references, and top-level block move/duplicate/delete through ProseMirror transactions. Existing onUpdate persists the resulting rich document. Media duplication references the same attachment. Markdown mode remains separate. Drag handles for arbitrary blocks and browser round-trip tests remain pending.

Outline: pointer-captured drag handles support touch and mouse; keyboard-accessible up/down buttons remain available. Reordering is one document transaction. Drag cancels if the underlying document changed. Direct inline handles and browser verification remain pending.
