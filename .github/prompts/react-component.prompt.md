# React Component Guidelines

When creating or modifying React components:

1. **Use functional components** with hooks - never class components
2. **Include PropTypes** for all props with accurate types
3. **Use memo()** for components that receive stable props and render frequently
4. **Handle all states**:
   - Loading state
   - Error state
   - Empty state
   - Success state
5. **Use optional chaining** for nested object access: `obj?.nested?.value`
6. **Destructure props** at the function parameter level
7. **Keep components focused** - extract sub-components if a component exceeds ~150 lines
8. **Use semantic HTML** - proper heading hierarchy, button vs div, etc.
9. **Accessibility** - include aria labels, proper focus management
10. **Consistent naming**:
    - Components: PascalCase (e.g., `DeckCard`)
    - Props/variables: camelCase (e.g., `onSelect`)
    - Event handlers: `handle*` prefix (e.g., `handleClick`)
    - Boolean props: `is*` or `has*` prefix (e.g., `isLoading`)
