from __future__ import annotations

import unittest

from campaign_email_brand import CAMPAIGN_TEMPLATES
from campaign_email_renderer import render_campaign_email


SAMPLE_LEAD = {
    "_id": "507f1f77bcf86cd799439011",
    "businessName": "Hawksmoor Manchester",
    "category": "Steak house",
    "city": "Manchester",
    "country": "United Kingdom",
    "rating": 4.7,
    "reviewCount": 120,
    "digitalGap": "weak_site",
    "website": "https://thehawksmoor.com/locations/manchester",
    "businessSummary": "Premium steakhouse on Deansgate.",
    "email": "manchester@thehawksmoor.com",
}


class CampaignEmailTests(unittest.TestCase):
    def test_template_registry_has_proposal_v1(self) -> None:
        self.assertIn("proposal_v1", CAMPAIGN_TEMPLATES)

    def test_proposal_v1_renders_all_sections(self) -> None:
        subject, html, text = render_campaign_email(
            SAMPLE_LEAD,
            "proposal_v1",
            "test-token",
        )
        self.assertIn("Hawksmoor Manchester", subject)
        self.assertIn("Personalised proposal", html)
        self.assertIn("Meet Estra Digital", html)
        self.assertIn("What we noticed about Hawksmoor Manchester", html)
        self.assertIn("SEO &amp; visibility", html)
        self.assertIn("Website &amp; UX", html)
        self.assertIn("A quick look at what we would build for you", html)
        self.assertIn("What we can do", html)
        self.assertIn("Ready to turn more searches into bookings?", html)
        self.assertIn("Unsubscribe", html)
        self.assertIn("Hawksmoor Manchester", text)

    def test_media_overrides_injected(self) -> None:
        custom_url = "https://res.cloudinary.com/demo/image/upload/seo.png"
        _subject, html, _text = render_campaign_email(
            SAMPLE_LEAD,
            "proposal_v1",
            "test-token",
            media_overrides={"seoReportUrl": custom_url},
        )
        self.assertIn(custom_url, html)

    def test_campaign_renderer_does_not_import_automated_renderer(self) -> None:
        import campaign_email_renderer as module

        with open(module.__file__) as handle:
            source = handle.read()
        self.assertNotIn("from email_renderer", source)
        self.assertNotIn("from email_personalization", source)
        self.assertNotIn("import email_renderer", source)


if __name__ == "__main__":
    unittest.main()
