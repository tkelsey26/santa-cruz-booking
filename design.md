# Design System — Santa Cruz Booking

A calm, coastal design language. Clean whites and slate neutrals anchored by a sea-blue brand colour.

---

## Colour Palette

### Brand — "Sea" scale
Defined in `src/index.css` via `@theme` and available as `bg-sea-*`, `text-sea-*`, `border-sea-*` etc.

| Token      | Approx hex | Usage |
|------------|-----------|-------|
| `sea-50`   | #f0f8fb   | Page backgrounds, hover surfaces |
| `sea-100`  | #ddf0f6   | Tinted panel backgrounds |
| `sea-200`  | #b8e1ec   | Borders on tinted surfaces |
| `sea-400`  | #5fb8d4   | Focus rings, secondary accents |
| `sea-500`  | #3aa3c4   | **Primary** — buttons, active states, links |
| `sea-600`  | #2e8fab   | Navbar, dark primary variant |
| `sea-700`  | #256f84   | Navbar border, very dark accents |

### Neutrals — Slate
Slate has a subtle blue tint that harmonises with the sea palette.

| Token        | Usage |
|--------------|-------|
| `slate-50`   | Card hover, subtle surfaces |
| `slate-100`  | Muted backgrounds, unavailable calendar days |
| `slate-200`  | Borders, input borders |
| `slate-400`  | Placeholder text, secondary icons |
| `slate-500`  | Secondary / muted text |
| `slate-700`  | Body text |
| `slate-800`  | Headings, primary text |
| `slate-900`  | Page title text |

### Semantic status colours
| Status   | Background        | Text           |
|----------|-------------------|----------------|
| Approved | `emerald-50`      | `emerald-700`  |
| Pending  | `amber-50`        | `amber-700`    |
| Rejected | `rose-50`         | `rose-700`     |
| Blocked  | `slate-100`       | `slate-600`    |
| Admin    | `violet-50`       | `violet-700`   |
| Priority | `amber-50`        | `amber-700`    |

---

## Typography

System font stack — no web font dependency.

```
font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
```

| Role            | Classes                                    |
|-----------------|--------------------------------------------|
| Page title      | `text-xl font-bold text-slate-800`         |
| Section heading | `text-base font-semibold text-slate-700`   |
| Card title      | `text-sm font-semibold text-slate-900`     |
| Body            | `text-sm text-slate-700`                   |
| Secondary/muted | `text-sm text-slate-500`                   |
| Label           | `text-sm font-medium text-slate-700`       |
| Micro label     | `text-xs font-semibold text-slate-400 uppercase tracking-widest` |
| Caption / hint  | `text-xs text-slate-400`                   |

---

## Spacing

| Context             | Value         |
|---------------------|---------------|
| Page vertical       | `py-8`        |
| Page horizontal     | `px-4 sm:px-6`|
| Max content width   | `max-w-3xl` (calendar/admin), `max-w-2xl` (lists), `max-w-sm` (login) |
| Between cards       | `space-y-3`   |
| Inside card         | `p-5`         |
| Between form fields | `space-y-4`   |
| Section gap         | `mb-6` or `mb-8` |

---

## Components

### Button
From `src/components/ui/button.jsx`. Uses `class-variance-authority`.

```jsx
<Button>Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost">Subtle</Button>
<Button size="sm">Small</Button>
```

Variants: `default` · `outline` · `destructive` · `secondary` · `ghost` · `link`  
Sizes: `default` · `sm` · `lg` · `icon`

### Badge
From `src/components/ui/badge.jsx`.

```jsx
<Badge variant="approved">Approved</Badge>
<Badge variant="pending">Pending</Badge>
<Badge variant="rejected">Rejected</Badge>
<Badge variant="admin">Admin</Badge>
<Badge variant="blocked">Blocked</Badge>
```

Variants: `default` · `approved` · `pending` · `rejected` · `blocked` · `admin` · `priority` · `regular`

### Card
From `src/components/ui/card.jsx`. White, `rounded-xl`, `border-slate-200`, subtle shadow.

```jsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Dialog
From `src/components/ui/dialog.jsx`. Wraps Radix Dialog with backdrop blur.

```jsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>
```

### Tabs
From `src/components/ui/tabs.jsx`. Wraps Radix Tabs with pill-style switcher.

```jsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">…</TabsContent>
  <TabsContent value="tab2">…</TabsContent>
</Tabs>
```

### Form inputs
```jsx
<Label htmlFor="x">Field name</Label>
<Input id="x" type="text" placeholder="…" />
<Textarea rows={3} placeholder="…" />
```

### Select
```jsx
<Select value={val} onValueChange={setVal}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Option A</SelectItem>
  </SelectContent>
</Select>
```

---

## Calendar day states
| Status        | Colour | Who sees it |
|---------------|--------|-------------|
| Available     | White, sea hover | Everyone |
| Today         | sea-400 ring | Everyone |
| My approved   | emerald-50 / emerald-700 | Owner + admin |
| My pending    | amber-50 / amber-700 | Owner + admin |
| Unavailable   | slate-100 / slate-400 | Guests (covers blocked + others' bookings) |
| Others' approved | emerald-50/60 (lighter) | Admin only |
| Others' pending  | orange-50 / orange-500 | Admin only |
| Blocked       | slate-200 / slate-500 | Admin only (detail) |
| Selection     | sea-500 / white | Active selection |
| Past          | slate-300 | Everyone |

---

## Navbar
`bg-sea-600` with `border-sea-700` bottom border. Active links use `bg-white/20`.

---

## Page backgrounds
`bg-sea-50` — a very slightly sea-tinted white. Defined in `body` in `index.css`.
