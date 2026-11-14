# Manual and automatic timetable workspaces

Generate timetable first offers Create Manually or Generate Automatically. Both lead to the existing editable timetable with live global clash checks. Automatic creation retains the current worker/review/apply flow. Manual creation saves a new named empty timetable using copied setup and teaching groups, preserving previous timetables.

Manual workspace: an unscheduled-class tray shows each teaching group and its remaining weekly classes. Drag a class to a room/day/slot or select it then click a cell (keyboard/touch). Choose an eligible teacher in a placement dialog with live warning preview. Conflicting placements are allowed and appear red immediately. Existing moves/swaps remain available. Existing Undo, edit, move and swap controls preserve class records and notes. The tray is also available for unplaced classes in automatic results. All progress uses existing autosave, backup, saved-timetable and ownership behavior.

Implementation plan:
1. Extract existing teaching-group construction into a shared scheduler helper without changing automatic behavior; add domain tests for empty manual setup, weekly limits, eligibility and clash detection.
2. Add the creation-mode chooser in App, including named alternatives. Manual creates the workspace directly; automatic uses worker preview. Avoid archiving an empty unnamed initial workspace.
3. Add tray and placement components plus pending-class handling in existing drop/click targets, including breaks. Reconcile newly added offerings into manual groups without changing placed classes.
4. Update existing generation browser helpers to choose automatic explicitly; add manual drag/click, live clash preview, saved reload and automatic editability tests. Run TypeScript, unit tests, browser suite and production build; inspect responsive workspace.
