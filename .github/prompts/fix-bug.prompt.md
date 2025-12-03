# Bug Fix Instructions

When fixing bugs in this codebase:

1. **Understand the error** - Read the full error message and stack trace
2. **Find all occurrences** - Search for ALL instances of the problematic pattern, not just the first one
3. **Maintain backward compatibility** - Existing data formats must still work
4. **Add defensive checks** - Use optional chaining (?.) and nullish coalescing (??)
5. **Test edge cases**:
   - Empty/null/undefined values
   - Legacy data formats (strings where objects are now expected)
   - New data formats (objects where strings were expected)
6. **Don't change unrelated code** - Keep changes focused on the bug
7. **Match existing style** - Follow the patterns already in the codebase
