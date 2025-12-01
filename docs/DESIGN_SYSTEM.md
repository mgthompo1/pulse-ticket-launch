# TicketFlo Design System

A comprehensive, human-crafted design system built for modern event management applications. This system emphasizes accessibility, consistency, and delightful user experiences.

## 🎨 Design Philosophy

Our design system is built on the principle that **every interaction should feel intentional and crafted**. We've moved away from AI-generated patterns to create a cohesive, thoughtful experience that users can trust and enjoy.

### Core Principles

1. **Consistency** - Every component follows the same design language
2. **Accessibility** - Built with WCAG guidelines in mind
3. **Performance** - Optimized animations and transitions
4. **Flexibility** - Multiple theme presets and customization options
5. **Human-centered** - Designed for real users, not algorithms

## 🌈 Color System

### Primary Palette
- **Primary**: Modern indigo/violet (`hsl(252 77% 60%)`)
- **Secondary**: Subtle gray-blue (`hsl(220 16% 96%)`)
- **Accent**: Supporting highlight (`hsl(220 16% 94%)`)

### Semantic Colors
- **Success**: Green for positive actions
- **Warning**: Amber for caution states
- **Error**: Red for destructive actions
- **Info**: Blue for informational content

### Theme Presets

#### Default (Modern Indigo)
- Clean, professional look
- High contrast for readability
- Suitable for most use cases

#### High Contrast
- Maximum accessibility
- Black/white with clear boundaries
- Perfect for users with visual impairments

#### Warm
- Cozy orange tones
- Friendly, approachable feel
- Great for community events

#### Cool
- Calm blue palette
- Professional, trustworthy
- Ideal for corporate events

## 📏 Spacing Scale

Our spacing system uses a consistent 4px base unit:

- **XS**: `0.5rem` (8px)
- **SM**: `0.75rem` (12px)
- **MD**: `1rem` (16px)
- **LG**: `1.5rem` (24px)
- **XL**: `2rem` (32px)

## 🔤 Typography

### Font Stack
Primary: `Plus Jakarta Sans`
Fallbacks: `Inter`, `system-ui`, `-apple-system`

### Scale
- **XS**: `0.75rem` - Captions, labels
- **SM**: `0.875rem` - Small text
- **Base**: `1rem` - Body text
- **LG**: `1.125rem` - Large text
- **XL**: `1.25rem` - Headings
- **2XL**: `1.5rem` - Section titles
- **3XL**: `1.875rem` - Page titles

### Weights
- **Normal**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

## 🎭 Component Library

### Core Components

#### Button
- Multiple variants: default, outline, ghost, gradient
- Hover effects with scale and lift animations
- Consistent spacing and typography
- Accessible focus states

#### Card
- Subtle shadows and borders
- Hover lift effects
- Consistent padding and spacing
- Gradient variants available

#### Input
- Clean, modern styling
- Focus ring with brand colors
- Consistent height and padding
- Error and success states

### Interactive Elements

#### Hover Effects
- **Scale**: Subtle 1.02x scale on hover
- **Lift**: 2px upward movement with shadow
- **Glow**: Brand color glow effects

#### Transitions
- **Smooth**: 200ms cubic-bezier(0.2, 0, 0, 1)
- **Bounce**: 300ms cubic-bezier(0.2, 0.7, 0.2, 1)
- **Fast**: 120ms for focus states

## 🎬 Animation System

### Entrance Animations
- **Fade In**: Smooth opacity transitions
- **Slide In**: Directional entrance effects
- **Scale In**: Subtle zoom effects
- **Staggered**: Sequential animations

### Loading States
- **Shimmer**: Subtle loading animation
- **Skeleton**: Placeholder content
- **Spinner**: Circular loading indicator

### Micro-interactions
- Button press feedback
- Form validation states
- Navigation transitions
- Hover state changes

## 🎨 Theme System

### Light Mode
- Clean white backgrounds
- Subtle gray borders
- High contrast text
- Soft shadows

### Dark Mode
- Deep, rich backgrounds
- Muted borders
- Light text
- Glowing accents

### Theme Switching
- System preference detection
- Manual toggle
- Persistent storage
- Smooth transitions

## 📱 Responsive Design

### Breakpoints
- **Mobile**: 0-640px
- **Tablet**: 641-1024px
- **Desktop**: 1025px+

### Mobile-First Approach
- Touch-friendly targets (44px minimum)
- Simplified navigation
- Optimized layouts
- Reduced animations

## ♿ Accessibility Features

### Visual
- High contrast themes
- Reduced motion support
- Focus indicators
- Color-blind friendly palette

### Interaction
- Keyboard navigation
- Screen reader support
- ARIA labels
- Semantic HTML

### Content
- Clear typography hierarchy
- Sufficient color contrast
- Meaningful alt text
- Logical tab order

## 🚀 Usage Examples

### Basic Button
```tsx
<Button variant="default" className="hover-scale">
  Click Me
</Button>
```

### Card with Hover Effects
```tsx
<Card className="gradient-card hover-lift">
  <CardContent>
    <h3>Card Title</h3>
    <p>Card content</p>
  </CardContent>
</Card>
```

### Animated List Item
```tsx
<div className="animate-in fade-in-0 hover-lift">
  List item content
</div>
```

### Loading State
```tsx
<div className="loading-shimmer h-4 rounded" />
```

## 🛠️ Customization

### CSS Custom Properties
All design tokens are available as CSS custom properties:

```css
:root {
  --primary: 252 77% 60%;
  --background: 0 0% 99%;
  --radius: 0.75rem;
}
```

### Theme Context
Use the theme context to access design tokens:

```tsx
import { useTheme } from '@/contexts/ThemeContext';

const { getThemeTokens } = useTheme();
const tokens = getThemeTokens();
```

### Component Variants
Most components support multiple variants:

```tsx
<Button variant="outline" size="sm" className="hover-scale">
  Custom Button
</Button>
```

## 📚 Resources

### Design Tokens
- View all tokens in the dashboard under "Design System"
- Interactive examples and usage patterns
- Live preview of theme changes

### Component Library
- Comprehensive component documentation
- Interactive playground
- Code examples and snippets

### Theme Playground
- Test different theme combinations
- Preview in various contexts
- Export custom themes

## 🔄 Updates and Maintenance

### Version Control
- Semantic versioning
- Changelog documentation
- Breaking change notices

### Contribution Guidelines
- Design token standards
- Component development rules
- Accessibility requirements

### Quality Assurance
- Automated testing
- Visual regression testing
- Accessibility audits

---

*This design system is continuously evolving. For questions or contributions, please refer to our development guidelines.*
