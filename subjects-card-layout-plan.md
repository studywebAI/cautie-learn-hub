# Subject Card Layout Restructure Plan

## Current Structure (subjects-grid.tsx lines 186-238)
```tsx
<Card key={subject.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
  <Link href={`/class/${classId}/subject/${subject.id}`}>
    <CardContent className="p-0">
      {/* Top half - Cover/Icon */}
      <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 rounded-t-lg flex items-center justify-center relative overflow-hidden">
        {subject.content?.cover_image_url ? (
          <img src={subject.content.cover_image_url} alt={subject.title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-6xl">
            {generatePlaceholderIcon(subject.content?.ai_icon_seed)}
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Bottom half - Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
          {subject.title}
        </h3>

        <p className="text-sm text-muted-foreground mb-3">
          {subject.content?.class_label || subject.title}
        </p>

        {/* Progress preview from API data */}
        <div className="space-y-2">
          {subject.recentParagraphs?.slice(0, 3).map((paragraph, index) => (
            <div key={paragraph.id}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{paragraph.title}</span>
                <span className="font-medium">{paragraph.progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${paragraph.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  </Link>
</Card>
```

## Target Structure (per user's specification)
```tsx
<Card key={subject.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
  <Link href={`/class/${classId}/subject/${subject.id}`}>
    <CardContent className="p-0">
      {/* Full card with image and overlay text */}
      <div className="aspect-[4/3] relative">
        {/* Background image/icon */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 flex items-center justify-center">
          {subject.content?.cover_image_url ? (
            <img src={subject.content.cover_image_url} alt={subject.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-6xl">
              {generatePlaceholderIcon(subject.content?.ai_icon_seed)}
            </div>
          )}
        </div>

        {/* Title and class label overlay on left side */}
        <div className="absolute left-4 top-4 max-w-[60%]">
          <h3 className="font-semibold text-lg text-white drop-shadow-lg mb-1">
            {subject.title}
          </h3>
          <p className="text-sm text-white/80 drop-shadow">
            {subject.content?.class_label || subject.title}
          </p>
        </div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Progress preview in bottom section */}
      <div className="p-4 bg-white dark:bg-gray-900">
        <div className="space-y-2">
          {subject.recentParagraphs?.slice(0, 3).map((paragraph, index) => (
            <div key={paragraph.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground truncate">{paragraph.title}</span>
                <span className="font-medium">{paragraph.progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${paragraph.progress}%` }} />
              </div>
            </div>
          ))}
          {(!subject.recentParagraphs || subject.recentParagraphs.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-2">No progress yet</p>
          )}
        </div>
      </div>
    </CardContent>
  </Link>
</Card>
```

## Implementation Steps

1. Replace the rounded-t-lg class with no rounding (since it's now full card)
2. Add overlay text div with title and class label
3. Darken the gradient from from-black/20 to from-black/60
4. Move progress section into separate bottom div with white background
5. Add "No progress yet" fallback text

## Key Changes Made:
- ✅ Title moved to overlay on left side of image
- ✅ Class label positioned under title in smaller font
- ✅ Image takes full card height, progress in separate white section
- ✅ Stronger gradient for better text contrast
- ✅ Added fallback text for subjects with no progress