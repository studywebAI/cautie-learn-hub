# Cautie Design System - Phase 1

**Status:** Foundation Phase  
**Last Updated:** May 27, 2026  
**Reference Design:** Flashcards State 1 Input

---

## Typography

### Heading Sizes
- **Page Title (H1):** `text-2xl md:text-3xl font-semibold` (32px / 48px on desktop)
- **Section Title (H2):** `text-xl font-semibold` (20px)
- **Subsection (H3):** `text-lg font-semibold` (18px)
- **Label/Overline:** `text-[10px] font-semibold uppercase tracking-[0.5px]` (10px, all caps)
- **Body Text:** `text-sm` (14px) or `text-base` (16px)
- **Small Text:** `text-xs` (12px)
- **Caption:** `text-[10px]` (10px)

**Color Rules:**
- Green accent only on username in sidebar/profiles
- Use `text-foreground` for primary content
- Use `text-muted-foreground` for secondary content
- Use `text-[#666]` or `text-muted-foreground` for labels/overlines
- No other accent colors in body text

---

## Spacing Scale

### Standard Spacing Units (based on Tailwind/4px baseline)
- **Extra Tight:** `0.5` (2px) - rarely used
- **Tight:** `1` (4px) - spacing between inline elements
- **Compact:** `1.5` (6px) - spacing within small groups
- **Normal:** `2` (8px) - standard spacing within components
- **Comfortable:** `3` (12px) - spacing between components
- **Loose:** `4` (16px) - section spacing
- **Very Loose:** `6` (24px) - major section breaks

### Practical Spacing Examples

#### Input/Button Areas (from Flashcards State 1)
```tsx
// Text input with label
<div className="space-y-1.5">
  <p className="text-[10px] font-semibold uppercase">Label</p>
  <Input className="h-9" /> // 36px height
</div>

// Pill selector with spacing
<div className="space-y-2">
  <p className="text-xs">Label</p>
  <div className="flex gap-2"> {/* 8px between buttons */}
    <button />
    <button />
  </div>
</div>

// Slider with label
<div className="space-y-2">
  <div className="flex justify-between">
    <p className="text-[10px] uppercase">Label</p>
    <span className="text-xs font-mono">{value}</span>
  </div>
  <Slider />
</div>
```

#### Section Grouping
```tsx
<div className="space-y-6"> {/* Major sections: 24px */}
  <div className="space-y-1.5"> {/* Title + content: 6px */}
    <h2 className="text-sm font-semibold">Section</h2>
    <p className="text-xs text-muted-foreground">Content</p>
  </div>
  
  <div className="border-t border-border pt-4"> {/* Divider with 16px padding */}
    {/* Next section */}
  </div>
</div>
```

#### Cards/Panels
```tsx
<div className="rounded-lg border border-border p-4"> {/* 16px padding */}
  <div className="space-y-3">
    <h3 className="text-sm font-semibold">Card Title</h3>
    <p className="text-xs text-muted-foreground">Content</p>
  </div>
</div>
```

---

## Component Sizing

### Input Elements
- **Input Field Height:** `h-9` (36px) - normal inputs
- **Input Field Height (Dense):** `h-8` (32px) - sidebar, dropdowns, secondary inputs
- **Button Height (Normal):** `h-10` (40px) - primary actions
- **Button Height (Small):** `h-9` (36px) - secondary actions
- **Button Height (Compact):** `h-8` (32px) - toolbar buttons

### Icons
- **Primary Icons:** `h-4 w-4` (16px) - in text, buttons, labels
- **Large Icons:** `h-6 w-6` (24px) - page-level actions, hero elements
- **Small Icons (Decorative):** `h-3 w-3` (12px) - in breadcrumbs, tags

### Padding (Content Areas)
- **Page/Container Padding:** `px-4 md:px-6 py-4 md:py-6`
- **Card Padding:** `p-4` (16px all sides)
- **Component Padding:** `px-3 py-2` (12px/8px)
- **Tight Padding:** `px-2 py-1` (8px/4px) - labels, tags

---

## Max Widths & Containers

### Content Widths
- **Full Width:** No max-width (stretch to container)
- **Wide Content:** `max-w-4xl` (56rem / 896px)
- **Normal Content:** `max-w-2xl` (42rem / 672px) - ✓ Used in Flashcards State 1
- **Narrow Content:** `max-w-lg` (32rem / 512px)
- **Minimal Content:** `max-w-sm` (24rem / 384px)

### Container Alignment
```tsx
// Centered content (Flashcards input style)
<div className="flex h-full w-full flex-col items-center justify-center p-4">
  <div className="w-full max-w-2xl space-y-4">
    {/* content */}
  </div>
</div>
```

---

## Layout Patterns

### State 1 (Input) Pattern ✓ Reference
Based on Flashcards State 1, which is the approved good design:

```tsx
<WorkbenchShell
  title="Create Flashcards"
  sidebar={<div />}
  hideSidebar={true}
>
  <div className="flex h-full w-full flex-col items-center justify-center p-4">
    <div className="w-full max-w-2xl space-y-4">
      {/* Heading section */}
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Flashcards
        </h1>
        <p className="text-sm text-muted-foreground">
          Subtitle or description
        </p>
      </div>

      {/* Input component */}
      <ToolInputBox
        placeholder="Enter your content..."
        submitLabel="Next"
      />
    </div>
  </div>
</WorkbenchShell>
```

**Key characteristics:**
- Centered, max-width-constrained content
- Clear heading hierarchy
- Subtle subtitle text
- Ample whitespace
- No sidebar (cleaner focus)
- Rounded button with clear CTA

---

## State 2 (Options) Pattern - To Apply

State 2 should show AI-filtered relevant settings, not generic ones:

```tsx
<div className="h-full flex flex-col">
  {/* Header with breadcrumb and back button */}
  <PageHeader
    title="Customize"
    subtitle="Adjust your flashcard settings"
    breadcrumb={breadcrumbs}
  />

  <div className="flex-1 overflow-auto">
    <div className="max-w-4xl mx-auto p-6">
      {/* Only relevant settings per tool */}
      <div className="space-y-6">
        <SettingGroup label="Study Mode" ... />
        <SettingGroup label="Card Sides" ... />
        <SettingGroup label="Advanced Options" ... />
      </div>
    </div>
  </div>

  {/* Footer with action buttons */}
  <div className="border-t border-border p-4 flex justify-end gap-2">
    <Button variant="outline" onClick={goBack}>Cancel</Button>
    <Button onClick={generate}>Generate</Button>
  </div>
</div>
```

---

## State 3 (Results/Study) Pattern - To Apply

Clean results presentation with proper loading states:

```tsx
<div className="h-full flex flex-col">
  {/* Thin header bar */}
  <PageHeader title="Study Results" hideBreadcrumb />

  {/* Main content area */}
  <div className="flex-1 overflow-auto">
    <div className="max-w-4xl mx-auto p-6">
      {/* Use skeleton loading while processing */}
      {isLoading ? (
        <SkeletonGroup>
          <Skeleton variant="title" />
          <Skeleton variant="card" />
        </SkeletonGroup>
      ) : (
        /* Results content */
      )}
    </div>
  </div>
</div>
```

---

## Skeleton Loading Standards

### Variants Available
```tsx
// Text line
<Skeleton variant="text" /> {/* h-4, w-full */}

// Title
<Skeleton variant="title" /> {/* h-8, w-3/4 */}

// Card
<Skeleton variant="card" /> {/* h-48, w-full, rounded-xl */}

// Circle
<Skeleton variant="circle" /> {/* h-10, w-10, rounded-full */}

// Button
<Skeleton variant="button" /> {/* h-10, w-24, rounded-lg */}

// Custom
<Skeleton className="h-32 w-full rounded-lg" />
```

### Skeleton Grouping
```tsx
<SkeletonGroup>
  <Skeleton variant="title" className="w-2/3" />
  <Skeleton variant="text" />
  <Skeleton variant="text" className="w-5/6" />
  <Skeleton variant="text" className="w-4/6" />
</SkeletonGroup>
```

### Skeleton Animation
- **Animation:** `animate-pulse` - subtle 2s pulse effect
- **Timing:** cubic-bezier(0.4, 0, 0.6, 1) - smooth, not jarring
- **Not shimmer:** Avoid harsh left-to-right shimmer, use gentle pulse instead

---

## Sidebar Animation Standards

### Collapse/Expand
- **Duration:** 300-400ms (currently too fast)
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out)
- **Elements animated:**
  - Width transition
  - Icon opacity
  - Text opacity
  - Icon rotation

**Use Framer Motion:**
```tsx
<motion.div
  animate={{ width: isOpen ? 256 : 44 }}
  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
>
  {/* Sidebar content */}
</motion.div>
```

---

## Color Restrictions

### Primary Text
- Green (var(--accent-brand)): **Only for username/profile in sidebar**
- Dark/Light (foreground): All body text

### Secondary Text
- Gray (muted-foreground): Descriptions, subtitles, helper text

### UI Elements
- Minimal use of green accent
- Favor grays, whites, borders for UI

### Example (Don't do this):
```tsx
{/* ❌ Wrong - too much green */}
<p className="text-green-600">Settings</p>
<span className="text-green-500">Online</span>

{/* ✓ Right */}
<p className="text-foreground">Settings</p>
<span className="text-muted-foreground">Online</span>
```

---

## Breadcrumb Format

### Path Structure
For tools: `username` → `Tools` → `Flashcards` → `Custom Title (if available)`

```tsx
<Breadcrumb items={[
  { label: 'john.doe', href: '/' },
  { label: 'Tools', href: '/tools' },
  { label: 'Flashcards', href: '/tools/flashcards' },
  { label: 'Biology Study Set' }, // No href - current page
]} />
```

### Visual Style
- `text-xs md:text-sm` (12px / 14px)
- `text-muted-foreground` base color
- `text-foreground font-medium` for current page (last item)
- `ChevronRight` icon between items: `text-muted-foreground/40`

---

## Animation Utilities

### Smooth Transitions
Use these classes for smooth animations:
- `.transition-smooth` - 300ms transitions
- `.transition-smooth-fast` - 150ms transitions
- `.transition-smooth-slow` - 500ms transitions
- `.smooth-opacity` - only opacity changes
- `.smooth-transform` - only transform changes
- `.smooth-size` - width/height changes

### Animation Effects
- `.animate-fade-in` - fade in 300ms
- `.animate-fade-in-up` - fade + slide up
- `.animate-scale-in` - scale from 95% to 100%
- `.animate-slide-in-from-left` / `-right`

**Example usage:**
```tsx
<div className="transition-smooth opacity-0 hover:opacity-100">
  Hover me
</div>

<div className="animate-fade-in">
  Fade in on load
</div>
```

---

## Common Mistakes to Avoid

1. **❌ Different text sizes per page** → Use `text-2xl` for all State 1 titles
2. **❌ Inconsistent spacing** → Always use `space-y-*` classes for vertical gaps
3. **❌ Too much green** → Restrict to username only
4. **❌ Fast animations** → 300-400ms minimum for sidebar, 150-200ms for buttons
5. **❌ Hard shadows** → Use subtle shadows only: `shadow-sm` or subtle borders
6. **❌ Too many padding values** → Pick one from the spacing scale, stick to it
7. **❌ Missing breadcrumbs** → Include on all State 2 and State 3 pages
8. **❌ Jarring skeleton animations** → Use gentle pulse, never harsh shimmer
9. **❌ Variable button heights** → Use `h-10` for primary, `h-9` for secondary consistently
10. **❌ Inconsistent input heights** → Use `h-9` for normal, `h-8` for dense

---

## Implementation Checklist

- [ ] Update all State 1 inputs to use max-w-2xl centered pattern
- [ ] Apply State 2 AI-filtered settings layout to Quiz, Notes, other tools
- [ ] Apply State 3 results layout to all tools
- [ ] Replace all "shitty loader" with skeleton loading system
- [ ] Reduce sidebar animation speed from current to 350ms
- [ ] Verify all text uses correct size (no green except username)
- [ ] Add PageHeader component to all tool pages
- [ ] Update Breadcrumb to show proper path
- [ ] Audit spacing - ensure consistent use of space-y-* classes
- [ ] Test on mobile, tablet, desktop

---

## References

- **Flashcards State 1:** `/app/(main)/tools/flashcards/page.tsx` (lines 385-419)
- **Skeleton Component:** `/app/components/ui/skeleton.tsx`
- **Page Header:** `/app/components/ui/page-header.tsx`
- **Breadcrumb:** `/app/components/ui/breadcrumb.tsx`
- **Animations:** `/app/styles/animations.css`

---

**Next Steps:** Phase 2 begins after confirming all Phase 1 changes are applied correctly.
