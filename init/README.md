# Demo Catalog Init

`init/init.json` is the Phase 19 demo catalog source.

Add product photos under paths referenced by the JSON, for example:

```text
init/img/logitech-mx-master-3s/1.jpg
init/img/logitech-mx-master-3s/2.jpg
```

The server validates the full JSON file and every referenced JPG/PNG before seeding. If any product field or image is missing or invalid, the app keeps the original four fallback products.

Local image files under `init/img/` are ignored by Git. They are meant for local demos and Docker build/Compose mounts, not for commits.
