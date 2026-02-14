
# Automation Discovery Dashboard — Implementation Plan

## Design Direction
Light & clean design with white/light gray backgrounds, professional typography, and subtle shadows. Inspired by tools like Notion and Figma — minimal, enterprise-ready, modern.

## Navigation & Layout
- **Left sidebar** with collapsible navigation covering all core sections: Overview, Knowledge Base, Process Upload, Process Analysis, Automation Discovery
- **Top header** with breadcrumbs and user avatar
- **Step indicator** subtly showing the journey: Context → Upload → Analyze → Approve → Discover

---

## Page 1: Overview Dashboard
The landing page with:
- **Summary stat cards**: Total companies, departments, processes uploaded, automation use cases found
- **Recent activity feed**: Latest uploads, approvals, discoveries
- **Quick action buttons**: "Add Company", "Upload Process", "View Discoveries"
- **Progress widget**: Shows how many processes are at each stage (uploaded, analyzed, approved, discovered)

## Page 2: Company Knowledge Base
A structured, hierarchical data browser:
- **Company list view** with cards showing industry, size, and department count
- **Drill-down navigation**: Company → Departments → Entities → Activities/Projects
- Each level has an **"Add" button** and items are clickable to expand/edit
- **Detail panels** open as slide-over side panels with editable fields:
  - Activities: description, business objective, tools used, documentation references
  - Tools: name, purpose, type (manual/semi-automated/system), related docs
- **Inline editing** and modal forms for adding new items
- All data is mock/hardcoded

## Page 3: Process Upload & Context Assignment
- **Drag-and-drop file upload area** for CSV files (UI only, no real parsing)
- After "uploading", show a **context assignment form**:
  - Select Company, Department, Entity, Activity/Project from dropdowns (populated with mock data from Knowledge Base)
  - Free text area for notes, assumptions, constraints
- **Upload history table** showing previously uploaded processes with status badges

## Page 4: Process Analysis — As-Is Generation
Triggered after selecting an uploaded process:
- **As-Is Process Description panel**:
  - Step-by-step textual breakdown (mock generated)
  - Roles involved listed as tags
  - Tools used listed as badges
- **Interactive Flowchart** (full drag & drop):
  - Nodes representing process steps, draggable and connectable
  - Click a node to edit its name/description in a modal
  - Delete nodes with a button
  - Add new steps
  - Built using a React flow library for drag-and-drop node editing
- **"Approve As-Is Process" button** that transitions the process to the discovery phase

## Page 5: Automation Use Case Discovery
Visible only after approval:
- **Cards view** (default): Each automation use case as a card showing:
  - Use case name
  - Description
  - Automation potential badge (Low / Medium / High with color coding)
- **Table view** toggle for a denser overview
- **Side panel detail view** when clicking a use case:
  - How it can be automated
  - Trigger description
  - Inputs & Outputs
  - Description of the automated process
- All data is mock, presented as if AI-generated

---

## Mock Data
Pre-populated with a realistic example:
- 1 sample company ("Acme Corp") with 2-3 departments, entities, activities, and tools
- 2 sample uploaded processes with mock analysis results
- 1 approved process with 3-4 mock automation use cases

## Key UX Details
- Smooth transitions between steps
- Toast notifications for actions (save, approve, upload)
- Responsive layout (desktop-first but usable on tablet)
- Empty states with helpful prompts when no data exists
