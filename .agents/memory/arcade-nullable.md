---
name: ArcadeGameStats nullable OpenAPI pattern
description: Orval generates invalid TS when nullable:true is on a root object schema — put nullable on the property reference instead
---

## Rule

Never put `nullable: true` on a root `type: object` schema in OpenAPI when using Orval.

Orval generates: `export interface Foo { ... } | null` which is invalid TypeScript syntax.

**Fix:** Make the type a plain object, and put `nullable: true` on each property that references it:
```yaml
MyArcadeStats:
  properties:
    fastBreak:
      nullable: true
      allOf:
        - $ref: "#/components/schemas/ArcadeGameStats"
```

Or just reference it without nullable and handle null at runtime.

**Why:** Orval 8.x emits `interface X {} | null` directly from nullable:true on root schemas, which TS doesn't accept. The union must be on the property, not the type declaration.
