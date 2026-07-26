# Requirements Document

## Introduction

This feature adds per-action **undo/redo** to the PDF annotation experience in the Note-Sphere Viewer (`PDFPreviewModal`). While annotating a PDF, a user can step **back** to reverse the most recent annotation action (undo) and step **forward** to re-apply an action that was just undone (redo).

The supported annotation actions are: creating a highlight, creating a scribble, and erasing (deleting) a mark. Undo/redo operate one action at a time on an in-memory, ordered action history scoped to the current Viewer session. Each reversal is persisted through the existing annotation API (POST to re-create, DELETE to remove) so the resulting annotation set remains consistent after a reload.

This is distinct from the existing **Revert** control, which clears *all* annotations at once. Undo/redo target a *single* action at a time and must coexist with — and preserve — the existing create, erase, and Revert behaviors, reusing the established optimistic-persistence error semantics from `useAnnotations`.

Scope is limited to the current Viewer session's action history (an in-memory stack) plus server persistence of each reversal. There is no cross-session or cross-device undo history.

## Glossary

- **Viewer**: The PDF preview session rendered by `PDFPreviewModal` in which a user views and annotates a single note's PDF.
- **Mark**: A single annotation record (a highlight or a scribble) belonging to the current note, described by its type, page number, color, normalized coordinates (rects for highlights, points for scribbles), and optional stroke width.
- **Annotation_Action**: A single reversible annotation operation within the Viewer — creating a highlight, creating a scribble, or erasing (deleting) a Mark.
- **Annotation_History**: The in-memory manager, active for the duration of the current Viewer session, that records performed Annotation_Actions and coordinates undo and redo. It owns the Undo_Stack and the Redo_Stack.
- **Undo_Stack**: The ordered collection of performed Annotation_Actions that are available to be reversed, most recent last.
- **Redo_Stack**: The ordered collection of undone Annotation_Actions that are available to be re-applied, most recently undone last.
- **Annotation_Toolbar**: The control strip in the Viewer (`AnnotationToolbar`) that hosts the tool switch, palette, stroke-width control, jump-to-page, Revert, and the new undo/redo controls.
- **Annotation_Service**: The existing owner-scoped persistence layer reached via `POST /api/notes/:id/annotations` (create) and `DELETE /api/notes/:id/annotations/:annotationId` (delete single), scoped to the authenticated user and the current note.
- **Revert**: The existing clear-all behavior that removes every annotation for the current note via `DELETE /api/notes/:id/annotations`.
- **Session**: The lifetime of a single mounted Viewer instance for one note.

## Requirements

### Requirement 1: Maintain an ordered action history

**User Story:** As a user annotating a PDF, I want each of my annotation actions recorded in order, so that I can reverse them one step at a time.

#### Acceptance Criteria

1. WHEN a user creates a highlight in the Viewer, THE Annotation_History SHALL append a create-highlight action referencing the created Mark to the Undo_Stack.
2. WHEN a user creates a scribble in the Viewer, THE Annotation_History SHALL append a create-scribble action referencing the created Mark to the Undo_Stack.
3. WHEN a user erases a Mark in the Viewer, THE Annotation_History SHALL append an erase action to the Undo_Stack, capturing the erased Mark's type, page number, color, normalized coordinates, and stroke width.
4. THE Annotation_History SHALL order actions in the Undo_Stack by the sequence in which the actions were performed during the current Session.
5. WHEN the current Session ends, THE Annotation_History SHALL discard the Undo_Stack and the Redo_Stack.

### Requirement 2: Undo the most recent action

**User Story:** As a user, I want to undo my most recent annotation action, so that I can step back to the previous state of the page.

#### Acceptance Criteria

1. WHEN a user activates Undo AND the top of the Undo_Stack is a create action, THE Annotation_History SHALL remove the created Mark from the Viewer and request deletion of that Mark via the Annotation_Service.
2. WHEN a user activates Undo AND the top of the Undo_Stack is an erase action, THE Annotation_History SHALL restore the erased Mark to the Viewer and request re-creation of that Mark via the Annotation_Service.
3. WHEN a user activates Undo AND the Undo_Stack is non-empty, THE Annotation_History SHALL move the reversed action from the Undo_Stack to the top of the Redo_Stack.
4. IF the Undo_Stack is empty WHEN a user activates Undo, THEN THE Annotation_History SHALL leave the annotation set, the Undo_Stack, and the Redo_Stack unchanged.
5. WHEN an undo operation completes successfully, THE Annotation_History SHALL have persisted the reversal through the Annotation_Service so that reloading the Viewer reflects the resulting annotation set.

### Requirement 3: Redo the most recently undone action

**User Story:** As a user, I want to redo an action I just undid, so that I can step forward again without recreating the mark manually.

#### Acceptance Criteria

1. WHEN a user activates Redo AND the top of the Redo_Stack is an undone create action, THE Annotation_History SHALL re-create the Mark via the Annotation_Service and render the Mark in the Viewer.
2. WHEN a user activates Redo AND the top of the Redo_Stack is an undone erase action, THE Annotation_History SHALL request deletion of the restored Mark via the Annotation_Service and remove the Mark from the Viewer.
3. WHEN a user activates Redo AND the Redo_Stack is non-empty, THE Annotation_History SHALL move the re-applied action from the Redo_Stack to the top of the Undo_Stack.
4. IF the Redo_Stack is empty WHEN a user activates Redo, THEN THE Annotation_History SHALL leave the annotation set, the Undo_Stack, and the Redo_Stack unchanged.
5. WHEN a redo operation completes successfully, THE Annotation_History SHALL have persisted the re-application through the Annotation_Service so that reloading the Viewer reflects the resulting annotation set.

### Requirement 4: New action clears redo history

**User Story:** As a user, I want a fresh annotation action to discard the forward history, so that undo/redo behaves like standard editors.

#### Acceptance Criteria

1. WHEN a user performs a new Annotation_Action (create highlight, create scribble, or erase) AND the Redo_Stack is non-empty, THE Annotation_History SHALL clear the Redo_Stack.
2. WHEN a user performs a new Annotation_Action, THE Annotation_History SHALL append the new action to the Undo_Stack.

### Requirement 5: Undo/redo controls in the toolbar

**User Story:** As a user, I want visible undo and redo buttons with clear enabled/disabled states, so that I know when stepping back or forward is available.

#### Acceptance Criteria

1. THE Annotation_Toolbar SHALL display an Undo control and a Redo control.
2. WHILE the Undo_Stack is empty, THE Annotation_Toolbar SHALL render the Undo control in a disabled state.
3. WHILE the Undo_Stack is non-empty, THE Annotation_Toolbar SHALL render the Undo control in an enabled state.
4. WHILE the Redo_Stack is empty, THE Annotation_Toolbar SHALL render the Redo control in a disabled state.
5. WHILE the Redo_Stack is non-empty, THE Annotation_Toolbar SHALL render the Redo control in an enabled state.
6. WHEN a user activates the enabled Undo control, THE Viewer SHALL invoke the Annotation_History undo operation.
7. WHEN a user activates the enabled Redo control, THE Viewer SHALL invoke the Annotation_History redo operation.

### Requirement 6: Persistence error handling

**User Story:** As a user, I want the interface to recover when saving an undo or redo fails, so that what I see always matches what is stored.

#### Acceptance Criteria

1. IF the Annotation_Service request for an undo operation fails, THEN THE Annotation_History SHALL restore the Viewer annotation set, the Undo_Stack, and the Redo_Stack to the state that existed immediately before that undo.
2. IF the Annotation_Service request for a redo operation fails, THEN THE Annotation_History SHALL restore the Viewer annotation set, the Undo_Stack, and the Redo_Stack to the state that existed immediately before that redo.
3. IF an undo or redo persistence request fails, THEN THE Viewer SHALL surface an error indication consistent with the existing optimistic-persistence error display.

### Requirement 7: Data integrity and scoping

**User Story:** As a user, I want a redone mark to reappear exactly where it was, and only my marks on this note to be affected, so that undo/redo is safe and accurate.

#### Acceptance Criteria

1. WHEN the Annotation_History re-creates a Mark, THE re-created Mark SHALL preserve the original Mark's type, page number, color, normalized coordinates, and stroke width.
2. WHEN the Annotation_Service assigns a new identifier to a re-created Mark, THE Annotation_History SHALL update its action records to reference the newly assigned identifier so that subsequent undo and redo operations target the correct Mark.
3. THE Annotation_History SHALL operate only on annotations belonging to the current user and the current note.

### Requirement 8: Preserve existing annotation behavior

**User Story:** As a user, I want existing create, erase, and Revert to keep working, so that adding undo/redo does not break the annotation tools I already use.

#### Acceptance Criteria

1. THE Viewer SHALL continue to support creating highlights, creating scribbles, and erasing Marks using the existing optimistic persistence behavior.
2. WHERE a user activates Revert, THE Viewer SHALL clear all annotations for the current note using the existing clear-all behavior.
3. WHEN a user activates Revert, THE Annotation_History SHALL clear the Undo_Stack and the Redo_Stack.
