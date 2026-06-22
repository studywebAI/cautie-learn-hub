# Claude Workflow — MVP Mode (PERMANENT)

## ✅ TESTED & WORKING (2024-06-22)

### The Workflow

1. **Claude (cloud session `@/home/user/cautie-learn-hub/`)**
   - Edits files locally using Read/Edit/Write tools
   - Auto-commits changes to `main` branch
   - Auto-pushes to `origin/main`
   - **NO manual git commands needed from Claude**

2. **User (Windows machine `C:\Projects\cautie-learn-hub\`)**
   - Runs `git pull origin main` to sync
   - Timing is user's choice — pull whenever ready
   - Can revert/fix if anything breaks

### Why This Works

- **Speed:** Claude commits instantly, no waiting for user approval
- **Control:** User controls pull timing, not forced
- **MVP-friendly:** No complex branching, no PR reviews, no CI gates
- **Safe:** Git history is clean, easy to revert if needed

### What Changed

- ❌ Old: `claude/session-nANUa` branch (special branch, complex)
- ✅ New: Direct `main` branch (simple, fast)
- ✅ Tested: Can push directly to `main` from cloud session

### Never Forget

- Claude works in cloud, User works on Windows
- They sync via `git pull` (user-initiated)
- Auto-commits go straight to `main`
- No special branches. Ever.
- Snelheid > perfectie (Speed > perfection)

---

**Last tested:** 2024-06-22 ✅  
**Workflow status:** PERMANENT & TESTED
