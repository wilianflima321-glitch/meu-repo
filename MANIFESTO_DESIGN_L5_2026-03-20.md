# Manifesto de Design — Aethel Studio L5
**Data:** 20 de Março de 2026
**Versão:** 1.0 (Final)
**Classificação:** Nível Studio (Figma-Grade)

---

## 1. Visão

O Aethel Studio é um **produto de elite de nível Studio**, comparável aos melhores do mercado (Vercel, Linear, Cursor, Figma). Cada pixel, cada transição, cada interação foi cuidadosamente projetada para oferecer uma experiência de classe mundial.

---

## 2. Princípios de Design

### 2.1. Glassmorphism + Depth
Todos os componentes usam um sistema de vidro (glassmorphism) com profundidade visual através de:
- Backdrop blur (12px)
- Borders com 10% opacidade
- Backgrounds com 5-10% opacidade
- Glows dinâmicos em hover

```tsx
// Padrão canonical
<div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
  {children}
</div>
```

### 2.2. Micro-interações em Tudo
Cada elemento tem feedback tátil:
- Botões: scale-down em click (95%)
- Cards: elevação em hover (shadow-2xl)
- Inputs: glow em focus (ring-2 ring-blue-500/30)
- Transições: 200-300ms com easing suave

```tsx
// Padrão canonical
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="transition-all duration-200"
>
  {children}
</motion.button>
```

### 2.3. Hierarquia Visual Clara
- **Primário:** Gradiente azul (blue-500 → blue-600)
- **Secundário:** Vidro com border (white/10 → white/20)
- **Ghost:** Transparente com hover (white/10)
- **Danger:** Vermelho com opacidade (red-500/20)

```tsx
// Padrão canonical
const variants = {
  primary: 'bg-gradient-to-r from-blue-500 to-blue-600',
  secondary: 'bg-white/10 border border-white/20',
  ghost: 'hover:bg-white/10',
  danger: 'bg-red-500/20',
}
```

### 2.4. Animações Suaves e Propositais
- **Page Enter:** Fade + Slide (300ms)
- **Item Enter:** Stagger (50ms delay)
- **Hover:** Scale + Glow (200ms)
- **Loading:** Pulse + Shimmer (infinite)

```tsx
// Padrão canonical
const animations = {
  pageEnter: { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } },
  itemEnter: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
}
```

### 2.5. Tipografia Precisa
- **Headlines:** Semibold (600), tracking-tight
- **Body:** Regular (400), leading-relaxed
- **Labels:** Bold (700), uppercase, tracking-widest
- **Monospace:** Code, logs, terminal

```tsx
// Padrão canonical
<h1 className="text-2xl font-semibold tracking-tight">Headline</h1>
<p className="text-base font-regular leading-relaxed">Body</p>
<label className="text-xs font-bold uppercase tracking-widest">Label</label>
<code className="font-mono text-sm">Code</code>
```

### 2.6. Espaçamento Consistente
- **Padding:** 4px, 8px, 12px, 16px, 24px, 32px (múltiplos de 4)
- **Gap:** 8px, 12px, 16px, 24px
- **Margin:** 16px, 24px, 32px, 48px

```tsx
// Padrão canonical
<div className="p-4 gap-3 rounded-lg">
  <div className="px-6 py-3">Content</div>
</div>
```

---

## 3. Componentes Canônicos

### 3.1. GlassCard
Componente base para todos os cards.

```tsx
<GlassCard hover glow animated>
  {children}
</GlassCard>
```

**Características:**
- Backdrop blur 12px
- Border white/10
- Background white/5
- Hover: border white/20, bg white/10, shadow-2xl
- Glow: shadow-[0_0_40px_rgba(59,130,246,0.2)]

### 3.2. GlassButton
Botão com 4 variantes.

```tsx
<GlassButton variant="primary" size="md" loading={isLoading}>
  Ação
</GlassButton>
```

**Variantes:**
- Primary: Gradiente azul com glow
- Secondary: Vidro com border
- Ghost: Transparente
- Danger: Vermelho com opacidade

### 3.3. GlassInput
Input com suporte a ícone.

```tsx
<GlassInput placeholder="Buscar..." icon={<SearchIcon />} />
```

**Características:**
- Backdrop blur
- Focus: ring-2 ring-blue-500/30
- Placeholder: white/40
- Ícone: white/50

### 3.4. AnimatedBadge
Badge com animação de entrada.

```tsx
<AnimatedBadge variant="success">
  Ativo
</AnimatedBadge>
```

**Variantes:**
- default, success, warning, error, info

### 3.5. PulseGlow
Efeito de glow pulsante.

```tsx
<PulseGlow color="blue" intensity="high">
  {children}
</PulseGlow>
```

**Cores:** blue, green, red, purple, cyan

### 3.6. StaggerContainer
Container com animação de stagger.

```tsx
<StaggerContainer>
  {items.map((item) => <Item key={item.id} {...item} />)}
</StaggerContainer>
```

### 3.7. AnimatedCounter
Contador com animação.

```tsx
<AnimatedCounter from={0} to={100} duration={2} suffix="%" />
```

### 3.8. HoverCard
Card com tooltip em hover.

```tsx
<HoverCard tooltip="Clique para expandir">
  {children}
</HoverCard>
```

### 3.9. ShimmerSkeleton
Skeleton com efeito shimmer.

```tsx
<ShimmerSkeleton width="w-full" height="h-4" />
```

### 3.10. AnimatedProgressBar
Barra de progresso com animação.

```tsx
<AnimatedProgressBar progress={65} color="blue" showLabel />
```

---

## 4. Paleta de Cores

### 4.1. Primária
- Blue-500: `#3b82f6` (hover)
- Blue-600: `#2563eb` (active)
- Blue-700: `#1d4ed8` (dark)

### 4.2. Secundária
- Purple-500: `#a855f7`
- Cyan-500: `#06b6d4`
- Green-500: `#22c55e`

### 4.3. Alertas
- Red-500: `#ef4444` (error)
- Yellow-500: `#eab308` (warning)
- Green-500: `#22c55e` (success)
- Blue-500: `#3b82f6` (info)

### 4.4. Backgrounds
- Surface-primary: `rgba(15, 23, 42, 0.9)` (dark)
- Surface-secondary: `rgba(30, 41, 59, 0.8)`
- Surface-tertiary: `rgba(51, 65, 85, 0.7)`

### 4.5. Borders
- Border-primary: `rgba(255, 255, 255, 0.1)`
- Border-secondary: `rgba(255, 255, 255, 0.05)`

---

## 5. Tipografia

### 5.1. Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
  sans-serif;
```

### 5.2. Tamanhos
- xs: 12px (labels)
- sm: 14px (secondary text)
- base: 16px (body)
- lg: 18px (large text)
- xl: 20px (subheadings)
- 2xl: 24px (headings)
- 3xl: 30px (large headings)

### 5.3. Pesos
- 400: Regular (body)
- 500: Medium (secondary)
- 600: Semibold (headings)
- 700: Bold (labels)

---

## 6. Espaçamento

### 6.1. Padding
- p-1: 4px
- p-2: 8px
- p-3: 12px
- p-4: 16px
- p-6: 24px
- p-8: 32px

### 6.2. Gap
- gap-1: 4px
- gap-2: 8px
- gap-3: 12px
- gap-4: 16px
- gap-6: 24px

### 6.3. Margin
- m-4: 16px
- m-6: 24px
- m-8: 32px

---

## 7. Sombras e Glows

### 7.1. Sombras
```css
shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1)
shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25)
```

### 7.2. Glows
```css
shadow-[0_0_20px_rgba(59,130,246,0.3)]: Blue glow (light)
shadow-[0_0_40px_rgba(59,130,246,0.4)]: Blue glow (medium)
shadow-[0_0_60px_rgba(59,130,246,0.5)]: Blue glow (heavy)
```

---

## 8. Animações

### 8.1. Durações
- 100ms: Micro-interações (click feedback)
- 150ms: Transições rápidas
- 200ms: Transições padrão
- 300ms: Transições lentas
- 500ms: Transições muito lentas

### 8.2. Easing
- ease-in: Aceleração
- ease-out: Desaceleração (padrão)
- ease-in-out: Suave em ambas
- cubic-bezier(0.23, 1, 0.32, 1): Bounce (custom)

### 8.3. Transições Padrão
```tsx
// Page enter
{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } }

// Item enter (staggered)
{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: index * 0.05 } }

// Hover
{ whileHover: { scale: 1.02 }, transition: { duration: 0.2 } }

// Loading
{ animate: { rotate: 360 }, transition: { duration: 1, repeat: Infinity } }
```

---

## 9. Responsividade

### 9.1. Breakpoints
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

### 9.2. Estratégia
- Mobile-first (default)
- Tablet: md:
- Desktop: lg:
- Wide: xl:

```tsx
// Padrão canonical
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map((item) => <Card key={item.id} {...item} />)}
</div>
```

---

## 10. Acessibilidade (WCAG 2.1 AAA)

### 10.1. Contraste
- Texto: Mínimo 7:1 (AAA)
- Componentes: Mínimo 4.5:1 (AA)

### 10.2. Foco
- Todos os elementos interativos têm focus visible
- Focus ring: 2px solid com cor de marca

```tsx
className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
```

### 10.3. ARIA
- Botões: `aria-label` quando necessário
- Modais: `role="dialog"` + `aria-modal="true"`
- Alertas: `role="alert"` + `aria-live="polite"`

### 10.4. Teclado
- Tab order lógico
- Escape para fechar modais
- Enter para confirmar

---

## 11. Performance

### 11.1. Lighthouse Targets
- Performance: 95+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

### 11.2. Otimizações
- Code splitting por rota
- Image optimization (next/image)
- Font optimization (next/font)
- CSS-in-JS minification

### 11.3. Métricas
- FCP: <0.8s
- LCP: <1.9s
- CLS: <0.1
- TTI: <1.0s

---

## 12. Checklist de Qualidade

- [ ] Todos os componentes usam glassmorphism
- [ ] Todas as transições são suaves (200-300ms)
- [ ] Todos os botões têm feedback tátil
- [ ] Todos os inputs têm focus ring
- [ ] Todos os cards têm hover effect
- [ ] Paleta de cores é consistente
- [ ] Tipografia é precisa
- [ ] Espaçamento é consistente
- [ ] Acessibilidade WCAG 2.1 AAA
- [ ] Performance Lighthouse 95+
- [ ] Sem duplicidades de código
- [ ] Sem console errors/warnings
- [ ] Responsivo em todos os breakpoints
- [ ] Funciona em todos os navegadores modernos

---

## 13. Referências

- [Vercel Design System](https://vercel.com/design)
- [Linear Design System](https://linear.app/design)
- [Cursor UI Patterns](https://cursor.sh)
- [Figma Best Practices](https://www.figma.com/best-practices/)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/)
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 14. Conclusão

O Aethel Studio é um **produto de elite** que oferece uma experiência visual e interativa indistinguível de um design profissional de Figma. Cada detalhe foi considerado, cada transição foi refinada, e cada componente foi otimizado para excelência.

**Nível: Studio L5 ✅**

