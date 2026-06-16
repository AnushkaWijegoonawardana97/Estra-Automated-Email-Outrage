# Email image assets

Outbound emails reference images hosted on the live Estra website. No images are embedded in this repo by default — URLs are defined in `email_brand.py` → `IMAGE_ASSETS`.

## Canonical URLs

| Asset | URL |
|-------|-----|
| Hero band | `https://www.estradigital.co.uk/images/hero-gradient.png` |
| ThesisTechHub | `https://www.estradigital.co.uk/images/work-thesistechhub.png` |
| EventBook.ai | `https://www.estradigital.co.uk/images/work-eventbook.png` |
| Ordexia | `https://www.estradigital.co.uk/images/work-ordexia.png` |

## Optional email-optimized copies

If originals exceed ~150KB or need resizing for email clients, add optimized copies to the axelri site:

```
axelri/public/images/email/hero-band.png   → 560×200, <150KB
```

Then update `IMAGE_ASSETS["hero_band"]` in `pipeline/email_brand.py`.

## Deploy checklist

1. Confirm images load over HTTPS on `www.estradigital.co.uk`
2. Run `pnpm pipeline:test-send` and verify images in Gmail + YOPmail
3. Check `alt`, `width`, and `height` on every `<img>` in rendered HTML
