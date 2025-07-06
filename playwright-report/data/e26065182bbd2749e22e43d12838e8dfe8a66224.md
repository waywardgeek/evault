# Page snapshot

```yaml
- alert
- dialog:
  - heading "Build Error" [level=1]
  - paragraph: Failed to compile
  - text: Next.js (14.2.30) is outdated
  - link "(learn more)":
    - /url: https://nextjs.org/docs/messages/version-staleness
  - link "./node_modules/@babel/runtime/helpers/asyncToGenerator.js":
    - text: ./node_modules/@babel/runtime/helpers/asyncToGenerator.js
    - img
  - text: "Error: ENOENT: no such file or directory, open '/home/waywardgeek/projects/evault/client/node_modules/@babel/runtime/helpers/asyncToGenerator.js'"
  - contentinfo:
    - paragraph: This error occurred during the build process and can only be dismissed by fixing the error.
```