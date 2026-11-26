# Multimedia editor

Photos are resized to at most 2048px and encoded in a dedicated worker using jSquash WASM AVIF or WebP. Default WebP quality 80; AVIF cqLevel 28. Keep the original when encoding fails or grows the file. GIF is preserved byte-for-byte to retain animation. Existing attachment limits remain in force. Markdown mode supports editing and applying Markdown; horizontal rules separate notes within a publication, not independent note records. Future work: durable individual note blocks, language-aware snippets, compression metrics, animated WebP handling and resumable uploads.
