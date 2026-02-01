# KPI Layout Guide - 5 Cards with Featured Design

## Implementation Summary

### Phone Layout (< 768px)
**4 KPIs in 2x2 Grid:**
```
┌──────────────┬──────────────┐
│ Total        │ Total        │
│ Products     │ Sold         │
│   25         │   11.9k      │
├──────────────┼──────────────┤
│ Low          │ Total        │
│ Stock        │ Debt         │
│   8          │   45.2k      │
└──────────────┴──────────────┘
```

### Tablet Layout (≥ 768px)
**5 KPIs with 1 Featured (Wider):**
```
┌──────────────┬──────────────┬──────────────┐
│ Total        │ Total        │ Low          │
│ Products     │ Sold         │ Stock        │
│   25         │   11.9k      │   8          │
├──────────────┴──────────────┼──────────────┤
│ ★ Active Customers          │ Total        │
│   156 (FEATURED)            │ Debt         │
│   +8 this week              │   45.2k      │
│   Clients with recent...    │              │
└─────────────────────────────┴──────────────┘
```

**Layout Rules:**
- First 3 KPIs: Regular size (1/3 width each)
- 4th KPI (Active Customers): **Featured** (2/3 width = DOUBLE size)
- 5th KPI (Total Debt): Regular size (1/3 width)

---

## Card Specifications

### Regular KPI Card
- **Width**: 1/3 of available width (on tablet)
- **Height**: 140px (tablet), 120px (phone)
- **Icon size**: 44px container (tablet), 36px (phone)
- **Value font**: 24px (tablet), 20px (phone)
- **Padding**: 20px (tablet), 16px (phone)

### Featured KPI Card (Tablet Only)
- **Width**: 2/3 of available width (DOUBLE width)
- **Height**: 160px (taller than regular)
- **Icon size**: 52px container (larger)
- **Value font**: 28px (bigger)
- **Extra content**: Shows description text below label
- **Background**: Same card style but more prominent
- **Padding**: 20px

---

## Visual Design

### Featured Card Appearance
```
┌────────────────────────────────────────┐
│  ┌────┐                    +8 this wk  │
│  │ 👥 │                                │
│  │ 52 │                                │
│  └────┘                                │
│                                        │
│         156                            │  ← Larger value (28px)
│     Active Customers                   │  ← Label
│     Clients with recent activity       │  ← Description (extra info)
└────────────────────────────────────────┘
```

### Regular Card Appearance
```
┌──────────────────┐
│ ┌──┐      +2 new │
│ │📦│             │
│ └──┘             │
│                  │
│      25          │  ← Value (24px)
│ Total Products   │  ← Label
└──────────────────┘
```

---

## Responsive Grid Calculations

### Phone (< 768px)
```typescript
columns = 2
cardWidth = (width - padding - gap) / 2
// Example: (375 - 32 - 12) / 2 = 165.5px per card
```

### Tablet (≥ 768px)
```typescript
// Special layout for 5 cards with 1 featured:
// Row 1: 3 regular cards (33% each)
// Row 2: 1 featured card (66%) + 1 regular (33%)

regularCardWidth = (width - padding - (gap * 2)) / 3
featuredCardWidth = (width - padding - gap) / 2 * 1.5

// Example at 900px tablet:
// Regular: (900 - 48 - 32) / 3 = 273px
// Featured: (900 - 48 - 16) / 2 = 418px (wider!)
```

---

## Color Palette

1. **Total Products** - #8B9DC3 (Soft Blue)
2. **Total Sold** - #86BC7A (Soft Green)
3. **Low Stock** - #E8B86D (Soft Amber)
4. **Total Debt** - #D4888F (Soft Rose)
5. **Active Customers** ⭐ - #7FB5B5 (Soft Teal) - FEATURED

---

## Featured Card Benefits

### Why Featured Card?
- **Highlights key metric** (Active Customers)
- **More visual prominence** on tablets
- **Shows additional context** (description)
- **Better use of tablet space**
- **Premium feel** for tablet UI

### Use Cases for Featured Cards
- Most important business metric
- Metric needing context/description
- Actionable insights
- Time-sensitive data

---

## Implementation Code

### In Dashboard Data:
```typescript
stats: [
  { label: "Total Products", value: "25", icon: "cube", 
    color: "#8B9DC3", trend: "+2 new", featured: false },
  { label: "Total Sold", value: "11.9k", icon: "receipt", 
    color: "#86BC7A", trend: "+15%", featured: false },
  { label: "Low Stock", value: "8", icon: "alert-circle", 
    color: "#E8B86D", trend: "Urgent", featured: false },
  { label: "Total Debt", value: "NLe 45.2k", icon: "cash", 
    color: "#D4888F", trend: "12 Clients", featured: false },
  { label: "Active Customers", value: "156", icon: "people", 
    color: "#7FB5B5", trend: "+8 this week", 
    description: "Clients with recent activity", 
    featured: true }, // ⭐ FEATURED
]
```

### In StatsGrid Component:
```typescript
const isFeatured = stat.featured && isTablet;
const cardWidth = isFeatured ? featuredCardWidth : regularCardWidth;

<StatCard 
  item={stat}
  cardWidth={cardWidth}
  isFeatured={isFeatured}
  ...
/>
```

---

## Testing Checklist

### Phone Testing (< 768px)
- [ ] Shows 4 KPIs only
- [ ] 2x2 grid layout
- [ ] No featured card
- [ ] Standard sizing

### Tablet Testing (768-1024px)
- [ ] Shows 5 KPIs
- [ ] First row: 3 regular cards
- [ ] Second row: 1 featured (wider) + 1 regular
- [ ] Featured card is visibly larger
- [ ] Description text shows on featured card
- [ ] Larger icons on featured card

### Large Tablet Testing (≥1024px)
- [ ] Same 5 KPI layout
- [ ] Content centered (max 1200px)
- [ ] Proper spacing maintained
- [ ] Featured card stands out

### Rotation Testing
- [ ] Layout adapts on rotation
- [ ] Card widths recalculate
- [ ] Featured card maintains prominence
- [ ] No layout breaks

---

## Design Philosophy

### Hierarchy
1. **Hero Card** (Revenue) - Primary metric, full width
2. **Featured KPI** (Active Customers) - Secondary focus, double width
3. **Regular KPIs** - Supporting metrics, standard size

### Progressive Enhancement
- **Phone**: Focus on essential 4 metrics
- **Tablet**: Add 5th metric with featured treatment
- **Large Tablet**: Enhanced spacing and two-column content

### Visual Balance
- Featured card doesn't dominate
- Clear visual grouping
- Consistent spacing
- Proper alignment

---

## Future Enhancements

### Possible Additions:
1. **Tap to expand** - Drill into KPI details
2. **Comparison views** - Show trends over time
3. **Configurable featured card** - Let user choose which metric to feature
4. **Animated transitions** - Smooth layout changes
5. **More featured cards** - 2-3 featured on very large tablets

### Analytics Integration:
- Track which KPIs users tap most
- A/B test featured card position
- Measure engagement by card size

---

## Pro Tips

### 1. Choosing Featured Metrics
Best candidates for featured treatment:
- ✅ Metrics with additional context needed
- ✅ Actionable insights requiring attention
- ✅ Key business indicators
- ❌ Simple counters without context
- ❌ Rarely-used metrics

### 2. Featured Card Content
Include:
- Larger icon (52px vs 44px)
- Bigger value (28px vs 24px)
- Description text (extra info)
- More padding for breathing room

### 3. Maintaining Balance
- Don't make featured card too dominant
- Keep consistent styling (shadows, borders)
- Ensure all cards are scannable
- Maintain visual rhythm

---

The 5-KPI layout with featured card provides a premium tablet experience while keeping the phone interface clean and focused! 🎨
