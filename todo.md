# GrowthOps AI — Project TODO

## Phase 1: Foundation
- [x] Initialize project scaffold (web-db-user template)
- [x] Create todo.md
- [x] Design system: dark B2B SaaS theme, Inter font, color tokens
- [x] Global AppLayout with sidebar navigation (9 nav items)
- [x] Workspace context/selector (Mr Diesel / TruckFixr)

## Phase 2: Database Schema
- [x] organizations table
- [x] workspaces table (with seed: Mr Diesel, TruckFixr)
- [x] brand_profiles table (with seed data)
- [x] campaigns table
- [x] leads table
- [x] content_drafts table
- [x] approvals table
- [x] agent_runs table
- [x] performance_logs table
- [x] integrations table
- [x] usage_records table
- [x] Extend users table with organization_id and role

## Phase 3: Backend API Routers
- [x] workspaces router (list, get, update)
- [x] brandProfiles router (get, update)
- [x] campaigns router (list, get, create, update)
- [x] leads router (list, get, create, update, delete)
- [x] contentDrafts router (list, get, create, update)
- [x] approvals router (list, get, create, update status)
- [x] agentRuns router (list, get, create)
- [x] integrations router (list, update status, sync, export CSV, gmail)
- [x] dashboard router (today's tasks summary)

## Phase 4: Dashboard Screen
- [x] Today's Growth Tasks widget
- [x] Pending approvals count + quick links
- [x] AI recommendations panel
- [x] Leads needing follow-up
- [x] Campaigns needing content
- [x] Ready drafts
- [x] Recent agent runs summary
- [x] Workspace selector in sidebar

## Phase 5: Workspace & Brand Profile Screen
- [x] Brand profile view (all fields)
- [x] Inline editing of brand voice, audience, services, pain points, CTAs, website
- [x] Save changes with optimistic update

## Phase 6: Campaigns Screen
- [x] Campaigns list with status badges
- [x] Create campaign form (name, objective, audience, offer, channel, dates)
- [x] Campaign detail view (expand/collapse)
- [x] Run Campaign Strategy Loop button → generates plan + content checklist + first drafts
- [x] Campaign status management

## Phase 7: Leads Screen
- [x] Leads list with fit/urgency scores
- [x] Add lead form (all fields)
- [x] Lead detail panel with outreach drafts
- [x] Run Lead/Prospecting Loop button → score + draft email + LinkedIn + follow-up
- [x] Lead status pipeline (dropdown)

## Phase 8: Content Calendar Screen
- [x] List view of drafts by status
- [x] Filter tabs by status
- [x] Quick view of draft content with AI critique notes
- [x] Run Content Loop button (topic + content types)

## Phase 9: Approval Queue Screen
- [x] List of items needing review (needs_review status)
- [x] Full draft view with AI rationale and risk notes
- [x] Approve / Reject / Request Revision buttons
- [x] Copy content to clipboard
- [x] Create Gmail draft button (mock mode)
- [x] Full audit log display (status filter tabs)

## Phase 10: Agent Runs Screen
- [x] Table of all agent run logs
- [x] Detail view: input/output JSON, model used, token usage, error logs
- [x] Timestamps and duration

## Phase 11: Integrations Screen
- [x] Gmail integration card (status, mock mode)
- [x] Google Sheets integration card (status, mock mode, sync buttons)
- [x] Mock mode toggle for all integrations
- [x] CSV export section (leads, campaigns, content_drafts, approvals)

## Phase 12: Settings Screen
- [x] Account info display
- [x] Workspace list
- [x] Platform info

## Phase 13: AI Agent Loops
- [x] Loop 2: Campaign Strategy Loop (plan + checklist + first drafts)
- [x] Loop 3: Content Loop (draft → self-critique → revise → approval queue)
- [x] Loop 4: Lead/Prospecting Loop (score fit/urgency + draft outreach)
- [x] Agent Self-Critique (every draft reviewed before saving)

## Phase 14: Integrations Implementation
- [x] CSV export for leads, campaigns, content drafts, approvals
- [x] Google Sheets mock sync (log sync attempt, show status)
- [x] Gmail draft creation mock (copy-to-clipboard fallback)
- [x] Integration status tracking in DB

## Phase 15: Polish & Tests
- [x] Loading states and empty states on all screens
- [x] Error handling and toast notifications
- [x] Vitest unit tests for core routers (19 tests passing)
- [x] Fix ThemeContext / next-themes conflict in sonner.tsx
- [x] Final checkpoint and delivery
