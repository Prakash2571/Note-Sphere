# Requirements Document

## Introduction

This feature adds a PDF annotation capability to the existing Note-Sphere PDF viewer (the `PDFPreviewModal` and `PDFDocument` React components). Authenticated users will be able to highlight text/sentences, draw freehand scribbles in selectable colors, revert an annotated PDF back to its original clean state, and jump directly to any page number.

Annotations are stored as an **overlay layer** that is scoped to a specific user and a specific note. The original PDF stored in S3 is never modified — annotations are persisted separately (annotation metadata in MongoDB) and re-applied on top of the rendered PDF each time the viewer is opened. Coordinates are stored in a scale-independent form so annotations render at the correct location across all zoom levels.

The feature is grounded in the existing stack: Next.js 16 route handlers, Auth.js v5 (`auth()`), Mongoose/MongoDB for metadata, AWS S3 for the source PDF, and `react-pdf` / `pdfjs-dist` for rendering (canvas render mode with the text layer enabled).

## Glossary

- **Annotation_Service**: The backend component (Next.js route handlers under `/api/notes/:id/annotations`) that persists, retrieves, and deletes annotations for a note.
- **Annotation_Overlay**: The client-side rendering layer positioned above the rendered PDF page that displays highlights and scribbles.
- **Highlight_Annotation**: An annotation created by selecting text/sentences in the PDF; represented as one or more rectangular regions on a page with a color.
- **Scribble_Annotation**: An annotation created by freehand drawing; represented as an ordered list of points (a stroke) on a page with a color and stroke width.
- **Annotation_Record**: A persisted annotation document belonging to one user and one note, containing type, page number, normalized coordinates, and color.
- **Normalized_Coordinates**: Coordinate values expressed as fractions between 0 and 1 relative to the unscaled page width and height, making them independent of the current zoom scale.
- **Color_Palette**: The fixed set of selectable colors offered for highlights and scribbles.
- **Source_PDF**: The original, unmodified PDF file stored in AWS S3, referenced by the note's `s3Key`.
- **Viewer**: The `PDFPreviewModal` component and its child `PDFDocument` component.
- **Owner**: The authenticated user whose `userId` matches the note's `userId`.
- **System**: The Note-Sphere application as a whole, including the Viewer, Annotation_Service, and Annotation_Overlay.
- **Eraser_Tool**: An annotation tool that deletes individual annotations (a single highlight or scribble) that the Owner touches or drags over, without affecting other annotations.
- **Pointer_Input**: Unified mouse, touch, and stylus input handled via the browser Pointer Events API.

## Requirements

### Requirement 1: Text/Sentence Highlighting

**User Story:** As a note owner, I want to select text or sentences in a PDF and highlight them, so that I can visually mark important passages.

#### Acceptance Criteria

1. WHEN the Owner selects a contiguous range of text on a single rendered PDF page and activates the highlight action, THE Annotation_Overlay SHALL, within 200 milliseconds, render a Highlight_Annotation as one or more rectangular regions covering every selected line using the currently selected color.
2. WHEN the Owner creates a Highlight_Annotation, THE Annotation_Service SHALL, within 2 seconds, persist an Annotation_Record containing the annotation type, the page number, the Normalized_Coordinates of each rectangular region, and the color.
3. THE Annotation_Service SHALL associate each Annotation_Record with both the Owner's userId and the note's identifier.
4. WHERE the Owner selects a highlight color from the Color_Palette, THE System SHALL apply that color to Highlight_Annotations created until a different color is selected.
5. IF the Owner activates the highlight action while no text is selected, THEN THE System SHALL take no persistence action, SHALL create no Highlight_Annotation, and SHALL leave existing annotations unchanged.
6. IF persisting a Highlight_Annotation fails, THEN THE Annotation_Service SHALL return an error result indicating the save did not complete, THE Annotation_Overlay SHALL remove the unpersisted highlight, and THE System SHALL leave previously persisted Annotation_Records unchanged.

### Requirement 2: Annotation Persistence and Reload

**User Story:** As a note owner, I want my highlights and scribbles to be saved permanently, so that they reappear the next time I open the PDF.

#### Acceptance Criteria

1. WHEN the Owner reopens a note in the Viewer, THE Annotation_Service SHALL, within 2 seconds, return all Annotation_Records (up to 5,000) belonging to the Owner for that note, returning an empty set when the note has none.
2. WHEN Annotation_Records are returned for a note, THE Annotation_Overlay SHALL render each annotation on its recorded page at the position defined by its Normalized_Coordinates within a tolerance of 1 pixel.
3. WHILE the current zoom scale differs from the scale at which an annotation was created, THE Annotation_Overlay SHALL render the annotation by applying the current scale to the Normalized_Coordinates within a tolerance of 1 pixel.
4. THE Annotation_Service SHALL restrict every read, create, and delete operation to Annotation_Records whose userId matches the authenticated Owner.
5. IF an unauthenticated request is made to the Annotation_Service, THEN THE Annotation_Service SHALL respond with an authorization error, SHALL perform no read, create, or delete, and SHALL NOT return any Annotation_Record.
6. IF an authenticated user who is not the Owner requests Annotation_Records for a note, THEN THE Annotation_Service SHALL respond with an authorization error and SHALL NOT return any Annotation_Record.
7. IF retrieval of Annotation_Records from the data store fails, THEN THE Annotation_Service SHALL return an error result and SHALL NOT return a partial set of Annotation_Records.

### Requirement 3: Extract/Revert to Original PDF

**User Story:** As a note owner, I want to revert an annotated PDF back to its original un-highlighted state, so that I can view or keep the clean source document.

#### Acceptance Criteria

1. WHEN the Owner confirms the revert-to-original action for a note, THE Annotation_Service SHALL delete all Annotation_Records belonging to the Owner for that note.
2. WHEN the revert-to-original action completes, THE Annotation_Overlay SHALL, within 2 seconds, display the PDF page with no Highlight_Annotation and no Scribble_Annotation.
3. THE System SHALL leave the Source_PDF in S3 unmodified during and after the revert-to-original action.
4. WHEN the Owner activates the revert-to-original action, THE System SHALL request explicit confirmation and SHALL NOT delete any Annotation_Record until the Owner confirms.
5. IF the revert-to-original action is confirmed for a note that has no Annotation_Records, THEN THE Annotation_Service SHALL return a success result and SHALL leave the note's annotation state unchanged.
6. IF the Owner cancels the confirmation prompt, THEN THE System SHALL delete no Annotation_Record and SHALL leave the displayed annotations unchanged.
7. IF deletion of Annotation_Records fails, THEN THE Annotation_Service SHALL return an error result and THE System SHALL preserve the existing Annotation_Records and displayed annotations.

### Requirement 4: Freehand Scribble Drawing

**User Story:** As a note owner, I want to draw freehand on the PDF using different colors, so that I can add handwritten marks and sketches.

#### Acceptance Criteria

1. WHILE freehand drawing mode is active, WHEN the Owner draws a stroke over a rendered PDF page, THE Annotation_Overlay SHALL render a Scribble_Annotation that follows the drawn path using the currently selected color and a stroke width between 1 and 20 pixels.
2. WHEN the Owner completes a Scribble_Annotation containing between 2 and 10,000 ordered stroke points, THE Annotation_Service SHALL persist an Annotation_Record containing the annotation type, the page number, the ordered Normalized_Coordinates of the stroke points, the color, and the stroke width.
3. WHERE the Owner selects a scribble color from the Color_Palette, THE System SHALL apply that color to subsequently drawn Scribble_Annotations.
4. WHILE freehand drawing mode is active, THE Viewer SHALL suppress default text selection on the PDF page so that drawing does not trigger text selection.
5. WHEN the Owner reopens the note, THE Annotation_Overlay SHALL render each persisted Scribble_Annotation at the position defined by its ordered Normalized_Coordinates.
6. IF the Owner completes a stroke that contains fewer than 2 distinct points, THEN THE System SHALL take no persistence action and SHALL leave existing annotations unchanged.
7. IF persisting a Scribble_Annotation fails, THEN THE Annotation_Service SHALL return an error result indicating that the save did not complete, and THE Annotation_Overlay SHALL retain the rendered Scribble_Annotation on the current page.

### Requirement 5: Jump to Page

**User Story:** As a note owner, I want to jump directly to a specific page number, so that I can navigate large PDFs quickly.

#### Acceptance Criteria

1. WHEN the Owner enters a whole number within the range from 1 to the note's total page count and submits it, THE Viewer SHALL display that page within 2 seconds of submission.
2. IF the Owner submits a page number less than 1 or greater than the total page count, THEN THE Viewer SHALL continue displaying the current page without change AND SHALL display an error indication that the entered page number is outside the valid range from 1 to the total page count.
3. IF the Owner submits a value that is not a whole number (including decimal values, non-numeric characters, or an empty input), THEN THE Viewer SHALL continue displaying the current page without change AND SHALL display an error indication that the entered value must be a whole number.
4. WHEN the displayed page changes through the jump-to-page action, THE Annotation_Overlay SHALL render only the Annotation_Records belonging to the newly displayed page within 2 seconds of the page change.

### Requirement 6: Color Palette Selection

**User Story:** As a note owner, I want a set of colors to choose from for highlights and scribbles, so that I can organize annotations by color.

#### Acceptance Criteria

1. THE System SHALL present a Color_Palette containing no fewer than 6 distinct, individually distinguishable predefined colors for both highlight and scribble tools.
2. WHEN the Owner selects a color from the Color_Palette, THE System SHALL mark that color as the single active color for the currently selected annotation tool and SHALL leave other tools' active colors unchanged.
3. WHERE no color has been explicitly selected for a tool, THE System SHALL apply a single deterministic predefined default color from the Color_Palette for that tool.
4. WHEN an Annotation_Record is persisted, THE Annotation_Service SHALL store the annotation's color as exactly one of the predefined Color_Palette values.
5. IF an annotation create request specifies a color that is not one of the predefined Color_Palette values, THEN THE Annotation_Service SHALL reject the request with a validation error and SHALL NOT persist any Annotation_Record.

### Requirement 7: Annotation Data Integrity (Round-Trip)

**User Story:** As a note owner, I want annotations to render exactly where I placed them after being saved and reloaded, so that my markings stay accurate.

#### Acceptance Criteria

1. FOR ALL Annotation_Records, serializing an annotation to its persisted form and then deserializing it SHALL produce an annotation whose type, page number, and color are exactly equal to the original, and whose Normalized_Coordinates each match the corresponding original value within an absolute tolerance of 0.000001, preserving the count and order of coordinate points (round-trip property).
2. THE Annotation_Service SHALL store every coordinate as a Normalized_Coordinate value greater than or equal to 0 and less than or equal to 1.
3. IF an annotation create request contains a coordinate value less than 0 or greater than 1, THEN THE Annotation_Service SHALL reject the request with a validation error indicating the out-of-range coordinate and SHALL NOT persist any Annotation_Record.
4. IF an annotation create request specifies a page number less than 1 or greater than the note's total page count, THEN THE Annotation_Service SHALL reject the request with a validation error indicating the invalid page number and SHALL NOT persist any Annotation_Record.
5. IF an annotation create request contains a coordinate value that is absent or not a number, THEN THE Annotation_Service SHALL reject the request with a validation error indicating the invalid coordinate and SHALL NOT persist any Annotation_Record.
6. IF an annotation create request specifies a page number that is not a whole number, THEN THE Annotation_Service SHALL reject the request with a validation error indicating the invalid page number and SHALL NOT persist any Annotation_Record.


### Requirement 8: Touch and Mobile Annotation Input

**User Story:** As a note owner using a touch device, I want to highlight and draw with my finger without the page panning or zooming, so that annotation works reliably on mobile.

#### Acceptance Criteria

1. WHILE an annotation tool (highlight, scribble, or eraser) is active, WHEN the Owner presses and drags on the rendered PDF page, THE Viewer SHALL perform that tool's action and SHALL prevent the browser's default touch panning and pinch-zoom within the page area.
2. WHILE the active tool is "none", THE Viewer SHALL allow normal touch scrolling and pinch-zoom of the PDF and SHALL NOT capture drawing input.
3. WHEN the Owner presses and drags with the highlight tool active across a region of the page, THE Annotation_Overlay SHALL create a Highlight_Annotation covering the selectable text within the dragged region, or covering the dragged region itself when it contains no selectable text.
4. THE Viewer SHALL capture annotation input equivalently for mouse, touch, and stylus using Pointer_Input.
5. IF a highlight or scribble drag produces no usable region (an empty or zero-area drag), THEN THE System SHALL take no persistence action and SHALL leave existing annotations unchanged.

### Requirement 9: Eraser Tool

**User Story:** As a note owner, I want an eraser to remove individual annotations, so that I can delete a single highlight or scribble without reverting the entire PDF to its original state.

#### Acceptance Criteria

1. WHERE the Eraser_Tool is active, WHEN the Owner taps or drags over an existing annotation on the current page, THE System SHALL delete that Annotation_Record via the single-annotation delete operation.
2. WHEN the Eraser_Tool deletes an annotation, THE Annotation_Overlay SHALL remove it from the displayed page within 200 milliseconds.
3. THE Eraser_Tool SHALL delete only the annotations intersected by the eraser pointer and SHALL leave all other Annotation_Records unchanged.
4. IF the Owner uses the Eraser_Tool at a location where no annotation exists, THEN THE System SHALL take no deletion action and SHALL leave all annotations unchanged.
5. THE active Color_Palette selection SHALL NOT affect the Eraser_Tool's behavior.
6. IF the single-annotation delete operation fails, THEN THE System SHALL restore the erased annotation to the displayed page and SHALL surface an error indication.
