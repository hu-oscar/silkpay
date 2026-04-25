# Sample documents for the Phase 3 demo

Drop 3-5 proforma invoice files (PDF or image) into this folder. Used during
the recorded demo to show Claude Vision extracting structured data live.

## Suggested mix

| File                       | Why it's useful for the demo                         |
| -------------------------- | ---------------------------------------------------- |
| `proforma-clean.pdf`       | High-confidence parse (≥ 0.95) — the headline shot   |
| `proforma-yiwu-cn.pdf`     | Chinese supplier address, USD pricing, FOB Incoterms |
| `proforma-rotated.jpg`     | Phone-photo angle — shows vision OCR robustness      |
| `proforma-handwritten.png` | Confidence < 0.85 → triggers manual-review banner    |

## Constraints (enforced server-side)

- ≤ 8 MB per file
- MIME type must be one of: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`

## How to source samples

- Real proformas you have permission to use (redact buyer/seller PII).
- AI-generated mock proformas (DALL-E or similar — make sure HSC codes,
  amounts, parties, and Incoterms look plausible).
- Public examples from Alibaba supplier listings (search "proforma invoice example pdf").

## Privacy

This folder is gitignored when it contains binary files (PDF/JPEG/PNG/WebP).
Only this README is committed.
