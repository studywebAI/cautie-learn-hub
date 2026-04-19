# Launch SQL Runbook

Generated: 2026-04-19T17:45:40.703Z

## Canonical Launch Migration Source
- Only `supabase/migrations/*.sql` is allowed for launch DB rollout.
- Root-level `*.sql` files are explicitly excluded from launch execution.

## Ordered Launch Migration Run List
1. `20250131_add_missing_tables.sql`
2. `20250131_notifications_table.sql`
3. `20250211_add_class_id_to_assignments.sql`
4. `20250211_add_scheduling_to_assignments.sql`
5. `20250211_cascade_archive_subjects.sql`
6. `20250213_add_assignment_enhancements.sql`
7. `20250215_add_type_to_assignments.sql`
8. `20250215_update_assignment_rls_for_direct_class_assignments.sql`
9. `20250216_add_foreign_key_indexes.sql`
10. `20250216_add_paragraph_id_to_assignments.sql`
11. `20250216_complete_schema_fixes.sql`
12. `20250217_unified_block_schema_final.sql`
13. `20250217_unified_block_schema_fixed.sql`
14. `20250217_unified_block_schema.sql`
15. `20250218_fix_class_members_rls.sql`
16. `20250218_fix_classes_rls.sql`
17. `20250218_fix_teacher_equality_validation.sql`
18. `20250218_fix_validation_and_rls.sql`
19. `20250218_teacher_collaboration_system.sql`
20. `20250219_class_invite_system.sql`
21. `20250220_fix_user_sessions.sql`
22. `20250220_simple_presence.sql`
23. `20250220_user_presence_and_activity.sql`
24. `20250221_attendance_system.sql`
25. `20250222_subscription_system.sql`
26. `20250223_cleanup_role_column.sql`
27. `20250224_consolidate_role_to_subscription_type.sql`
28. `20250225_final_subscription_fix.sql`
29. `20250226_drop_class_members_role.sql`
30. `20250227_add_email_to_profiles.sql`
31. `20250228_add_grading_only.sql`
32. `20250228_fix_class_members_role.sql`
33. `20250228_grading_system.sql`
34. `20250229_fix_classes_insert_policy.sql`
35. `20250229_fix_classes_teacher_equality.sql`
36. `20250229_migrate_class_owners_to_members.sql`
37. `20250229_remove_class_members_role_and_owner.sql`
38. `20260302_grading_presets_and_flexible_scores.sql`
39. `20260302_harden_grades_security.sql`
40. `20260305_fix_submissions_assignments_fk.sql`
41. `20260319_add_chapters_description.sql`
42. `20260324_unified_agenda_items.sql`
43. `20260402_presentation_tool_v1.sql`
44. `20260403_presentation_workflow_state.sql`
45. `20260404_community_v1.sql`
46. `20260404_integration_dedupe_and_materials_hardening.sql`
47. `20260409_ai_error_logs.sql`
48. `20260410_server_side_persistence_hardening.e.sql`
49. `20260411_assignment_runtime_settings.e.sql`
50. `20260412_permissions_and_logs_hardening.e.sql`
51. `20260415_class_member_alias_and_attendance_note_removal.sql`
52. `20260416_blocks_updated_at_compat.sql`
53. `20260416_class_ops_logs_and_attendance_hardening.sql`
54. `20260419_rls_hardening_post_legacy.sql`

## Excluded Migration Files (supabase/migrations)
- `20250218_debug_rls.sql`: Debug migration not allowed in launch pipeline
- `20250229_restore_class_members.sql`: One-off recovery migration excluded from clean launch setup

## Excluded Root-Level SQL Files (manual/archive only)
- `add-assignment-columns.sql`
- `add-class-id-to-assignments.sql`
- `add-class-id-to-subjects.sql`
- `add-completed-to-assignments.sql`
- `add-deadline-column.sql`
- `add-description-to-subjects.sql`
- `add-email-to-profiles.sql`
- `add-missing-profile-columns.sql`
- `add-title-to-subjects.sql`
- `add-type-to-assignments.sql`
- `add-user-id-to-subjects.sql`
- `ai-grading-setup.sql`
- `ai-provider-user-keys.e.sql`
- `apply-classes-rls-fix.sql`
- `backend-schema-alignment.sql`
- `check_students.sql`
- `check-assignment-hierarchy.sql`
- `check-assignments.sql`
- `check-classes-structure.sql`
- `check-new-classes.sql`
- `check-profiles-table.sql`
- `check-schema.sql`
- `check-specific-assignment.sql`
- `check-subjects.sql`
- `cleanup-assignments.sql`
- `cleanup-deadlines.sql`
- `complete-hierarchy-setup-fixed-final.sql`
- `complete-hierarchy-setup.sql`
- `complete-system-setup.sql`
- `comprehensive-database-fix.sql`
- `comprehensive-fix-final.sql`
- `comprehensive-fix.sql`
- `corrected-database-fix.sql`
- `database-assessment-management.sql`
- `database-attendance.sql`
- `database-blocks.sql`
- `database-cautie-hierarchy.sql`
- `database-chapter-subchapter.sql`
- `database-class-templates.sql`
- `database-communication.sql`
- `database-expanded-learning.sql`
- `database-hierarchical-schema.sql`
- `database-learnbeat-integration.sql`
- `database-performance-fix.sql`
- `database-personal-tasks-enhancement.sql`
- `database-subjects-hierarchy-complete.sql`
- `database-subjects-hierarchy.sql`
- `database-subjects-simple.sql`
- `database-submissions.sql`
- `database-unified-notifications.sql`
- `database-updates-fixed.sql`
- `database-updates.sql`
- `debug-profile.sql`
- `debug-role-switching.sql`
- `diagnose-assignment-issue.sql`
- `diagnose-database-issues.sql`
- `diagnose-database-state.sql`
- `diagnose-teacher-equality-issues.sql`
- `diagnose-teacher-equality-quick.sql`
- `diagnose-validation-issues.sql`
- `disable_subjects_rls.sql`
- `disable-all-rls-completely.sql`
- `disable-all-rls.sql`
- `disable-rls-completely.sql`
- `e.sql`
- `emergency-fix.sql`
- `emergency-rls-disable.sql`
- `emergency-rls-fix-final.sql`
- `emergency-rls-fix.sql`
- `final-classes-rls-fix.sql`
- `final-database-fix-clean.sql`
- `final-database-fix.sql`
- `final-database-setup.sql`
- `final-working-migration.sql`
- `fix-announcements-profiles-relationship-hard-refresh.sql`
- `fix-announcements-profiles-relationship.sql`
- `fix-assignment-rls.sql`
- `fix-class-members-profiles-relationship.sql`
- `fix-class-members-role.sql`
- `fix-class-members-schema.sql`
- `fix-classes-rls.sql`
- `fix-database-issues.sql`
- `fix-dual-assignments-system.sql`
- `fix-existing-classes.sql`
- `fix-existing-policies.sql`
- `fix-existing-subjects-class-id.sql`
- `fix-hierarchical-rls.sql`
- `fix-infinite-recursion.sql`
- `fix-join-code-lookup-function.sql`
- `fix-profiles-rls.sql`
- `fix-relationships-no-drop.sql`
- `fix-rls-recursion-final-v2.sql`
- `fix-rls-recursion-final.sql`
- `fix-rls-recursion-powershell.sql`
- `fix-rls-recursion-with-functions.sql`
- `fix-role-switching.sql`
- `fix-submissions-foreign-key.sql`
- `integration-sources-foundation.sql`
- `make-subjects-independent.sql`
- `manage-settings-and-tab-telemetry.sql`
- `materials-rls-fix.sql`
- `microsoft-readonly-integration.sql`
- `migrate-classes-table.sql`
- `migrate-to-paragraphs-hierarchy-fixed.sql`
- `migrate-to-paragraphs-hierarchy.sql`
- `minimal-assignment-fix.sql`
- `minimal-safe-fix.sql`
- `nuke-all-policies.sql`
- `performance-db-indexes.sql`
- `revert-to-simple-schema.sql`
- `rls-complete-fix.sql`
- `rls-debug-fix.sql`
- `rls-profiles-fix.sql`
- `run-complete-hierarchy-migration.sql`
- `run-this-migration.sql`
- `safe-classes-rls-fix.sql`
- `setup-database.sql`
- `studyset-adaptive-normalized.sql`
- `subjects-hierarchy-schema-final.sql`
- `subjects-hierarchy-schema-fixed.sql`
- `subjects-hierarchy-schema.sql`
- `supabase-manual-setup.sql`
- `supabase-tables.sql`
- `sync-new-database.sql`
- `temp-disable-profiles-rls-for-testing.sql`
- `temp-disable-profiles-rls.sql`
- `temp-disable-tables-rls.sql`
- `temp-migration.sql`
- `temporarily-disable-rls.sql`
- `test-blocks.sql`
- `test-subscription-update.sql`
- `toolbox-v2-manual.sql`
- `update-user-subscription.sql`

## Verification Checklist (run after apply)
- [ ] `student_attendance` write/read works for all attendance action types.
- [ ] `audit_logs` writes log code + category for attendance/rename/class events.
- [ ] RLS is enabled on `classes`, `class_members`, `subjects`, `assignments`.
- [ ] Class alias (`class_members.display_name`) is readable in group + attendance + logs.
- [ ] `npm run typecheck` passes against current schema assumptions.
