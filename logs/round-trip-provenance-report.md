# Round-trip Provenance Report

**Date:** 2026-01-16T14:37:25.330Z

## Summary

- Total checked: 15
- Perfect matches: 15
- Minor issues: 0
- Critical issues: 0

> **Note:** Minor issues включают ожидаемые различия:
> - `source`: экспорт использует `"vova-petrova"`, граф — более конкретные значения (`"kb"`, `"stories"`)
> - `provenance`: граф упрощает provenance (использует `path` вместо `file`, может не включать `hash`)

## Terms (10 selected)

| Slug | Stable ID | Status | Issues |
|------|-----------|--------|--------|
| aliases | `vovaipetrova:kb:aliases` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="kb" |
| autolink | `vovaipetrova:kb:autolink` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="kb" |
| backlinks | `vovaipetrova:kb:backlinks` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="kb" |
| canonical-slug | `vovaipetrova:kb:canonical-slug` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="kb" |
| facets | `vovaipetrova:kb:facets` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="kb" |
| glossary-lite | `vovaipetrova:kb:glossary-lite` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="kb" |
| link-map | `vovaipetrova:kb:link-map` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="kb" |
| machine-tags | `vovaipetrova:kb:machine-tags` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="kb" |
| routes | `vovaipetrova:kb:routes` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="kb" |
| snapshot | `vovaipetrova:kb:snapshot` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="kb" |

## Docs (5 selected)

| Slug | Stable ID | Status | Issues |
|------|-----------|--------|--------|
| 001-rannie-stranicy-notion-indeks-i-think-tank | `vovaipetrova:stories:001-rannie-stranicy-notion-indeks-i-think-tank` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="stories" |
| 002-adr-source-of-truth-i-zerkalirovanie | `vovaipetrova:stories:002-adr-source-of-truth-i-zerkalirovanie` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="stories" |
| 003-kontentmodel-i-marshruty | `vovaipetrova:stories:003-kontentmodel-i-marshruty` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="stories" |
| 004-start-importa-notion-v-github | `vovaipetrova:stories:004-start-importa-notion-v-github` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="stories" |
| 005-ci-rejly-i-lint-normalize | `vovaipetrova:stories:005-ci-rejly-i-lint-normalize` | ✅ perfect | source mismatch (expected): export="vova-petrova", graph="stories" |

## Detailed Comparison

### Terms Details

#### aliases (`vovaipetrova:kb:aliases`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:kb:aliases",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/kb_terms.v1.jsonl",
    "line": 1,
    "hash": "858f17035082e101c1a7c2617d92ba0bb9f4293c1c8d6ad70010d68e099e53a4"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:kb:aliases",
  "project_id": "vovaipetrova",
  "source": "kb",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/kb_terms.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="kb"


#### autolink (`vovaipetrova:kb:autolink`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:kb:autolink",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/kb_terms.v1.jsonl",
    "line": 2,
    "hash": "d49aaffa65143b79ac34033385aaa3c9d11f717649eda02cae65817e736f3323"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:kb:autolink",
  "project_id": "vovaipetrova",
  "source": "kb",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/kb_terms.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="kb"


#### backlinks (`vovaipetrova:kb:backlinks`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:kb:backlinks",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/kb_terms.v1.jsonl",
    "line": 3,
    "hash": "38ef7b8ae28d039f6230ffeebd3abac72f9abc3085d59f4f313398daa403b629"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:kb:backlinks",
  "project_id": "vovaipetrova",
  "source": "kb",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/kb_terms.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="kb"


#### canonical-slug (`vovaipetrova:kb:canonical-slug`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:kb:canonical-slug",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/kb_terms.v1.jsonl",
    "line": 4,
    "hash": "3f52db98f6033bb5b84e7397de470daf6a41a588c1412d3b05dc890aed39dc18"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:kb:canonical-slug",
  "project_id": "vovaipetrova",
  "source": "kb",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/kb_terms.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="kb"


#### facets (`vovaipetrova:kb:facets`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:kb:facets",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/kb_terms.v1.jsonl",
    "line": 5,
    "hash": "dd6669225817eb2ee8bb7e33b5d083fb54cedf2f13dc1def1bac3e2e65d98e12"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:kb:facets",
  "project_id": "vovaipetrova",
  "source": "kb",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/kb_terms.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="kb"


#### glossary-lite (`vovaipetrova:kb:glossary-lite`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:kb:glossary-lite",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/kb_terms.v1.jsonl",
    "line": 6,
    "hash": "7704192fffda55d23bd09b31ea13daf957d69adbea4555e8a00ab9380176f875"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:kb:glossary-lite",
  "project_id": "vovaipetrova",
  "source": "kb",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/kb_terms.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="kb"


#### link-map (`vovaipetrova:kb:link-map`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:kb:link-map",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/kb_terms.v1.jsonl",
    "line": 7,
    "hash": "514468a2f190addd7db3803913eecb14110dbe52324c73b5490b2b897dc96496"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:kb:link-map",
  "project_id": "vovaipetrova",
  "source": "kb",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/kb_terms.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="kb"


#### machine-tags (`vovaipetrova:kb:machine-tags`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:kb:machine-tags",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/kb_terms.v1.jsonl",
    "line": 8,
    "hash": "b04a7f95e81d297ac6a7a1ee1900b56fa8da6e987b746abe693de58751bcd972"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:kb:machine-tags",
  "project_id": "vovaipetrova",
  "source": "kb",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/kb_terms.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="kb"


#### routes (`vovaipetrova:kb:routes`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:kb:routes",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/kb_terms.v1.jsonl",
    "line": 9,
    "hash": "0c6b6d5805f946233531ed512fd6261ab8a29897305b7d26c7e90612c9acbd5c"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:kb:routes",
  "project_id": "vovaipetrova",
  "source": "kb",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/kb_terms.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="kb"


#### snapshot (`vovaipetrova:kb:snapshot`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:kb:snapshot",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/kb_terms.v1.jsonl",
    "line": 10,
    "hash": "73b7d1423da2d185f2617f8fbc614142a45eb0db4d47b5411d896b3baf36e9c5"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:kb:snapshot",
  "project_id": "vovaipetrova",
  "source": "kb",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/kb_terms.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="kb"


### Docs Details

#### 001-rannie-stranicy-notion-indeks-i-think-tank (`vovaipetrova:stories:001-rannie-stranicy-notion-indeks-i-think-tank`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:stories:001-rannie-stranicy-notion-indeks-i-think-tank",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/stories.v1.jsonl",
    "line": 1,
    "hash": "8a87411d9d82330d200907227173186cf9a85db156b1a1a06b73fdb3eefed644"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:stories:001-rannie-stranicy-notion-indeks-i-think-tank",
  "project_id": "vovaipetrova",
  "source": "stories",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/stories.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="stories"


#### 002-adr-source-of-truth-i-zerkalirovanie (`vovaipetrova:stories:002-adr-source-of-truth-i-zerkalirovanie`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:stories:002-adr-source-of-truth-i-zerkalirovanie",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/stories.v1.jsonl",
    "line": 2,
    "hash": "500a00577bb7b51e9c15edbedc5d475c527f3de1c3e7f7ef279a4fa5c7a17c4e"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:stories:002-adr-source-of-truth-i-zerkalirovanie",
  "project_id": "vovaipetrova",
  "source": "stories",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/stories.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="stories"


#### 003-kontentmodel-i-marshruty (`vovaipetrova:stories:003-kontentmodel-i-marshruty`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:stories:003-kontentmodel-i-marshruty",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/stories.v1.jsonl",
    "line": 3,
    "hash": "61109822553e5dc0fb9160a75d1a26ec19a6f85dd4230499139b2337f09fe591"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:stories:003-kontentmodel-i-marshruty",
  "project_id": "vovaipetrova",
  "source": "stories",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/stories.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="stories"


#### 004-start-importa-notion-v-github (`vovaipetrova:stories:004-start-importa-notion-v-github`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:stories:004-start-importa-notion-v-github",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/stories.v1.jsonl",
    "line": 4,
    "hash": "75080952fc665c66145098883db696a276983587a522e52025c0e3b0e844fbd3"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:stories:004-start-importa-notion-v-github",
  "project_id": "vovaipetrova",
  "source": "stories",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/stories.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="stories"


#### 005-ci-rejly-i-lint-normalize (`vovaipetrova:stories:005-ci-rejly-i-lint-normalize`)

**Export:**
```json
{
  "stable_id": "vovaipetrova:stories:005-ci-rejly-i-lint-normalize",
  "project_id": "vovaipetrova",
  "source": "vova-petrova",
  "graph_version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "file": "data/exports/stories.v1.jsonl",
    "line": 5,
    "hash": "b8b54d023593ef5b58543d6e3cceab7025e1204a3b29325c6631a1d34f0aea36"
  }
}
```

**Graph:**
```json
{
  "stable_id": "vovaipetrova:stories:005-ci-rejly-i-lint-normalize",
  "project_id": "vovaipetrova",
  "source": "stories",
  "version": "0.1",
  "provenance": {
    "system": "repo",
    "origin": "exports",
    "path": "data/exports/stories.v1.jsonl"
  }
}
```

**Issues:**
- source mismatch (expected): export="vova-petrova", graph="stories"


