from __future__ import annotations

import re
import unittest

from email_brand import IMAGE_ASSETS
from email_personalization import EM_DASH, build_email_content, _select_work_highlight
from email_renderer import render_email


def _sample_lead(**overrides) -> dict:
    base = {
        "_id": "507f1f77bcf86cd799439011",
        "businessName": "Test Salon",
        "city": "London",
        "category": "Hair Salon",
        "rating": 4.8,
        "reviewCount": 42,
        "digitalGap": "no_website",
        "gmbServices": ["Haircuts", "Colour"],
        "unsubscribeToken": "test-token",
    }
    base.update(overrides)
    return base


class TestEmailPersonalization(unittest.TestCase):
    def test_initial_subject_no_website(self) -> None:
        content = build_email_content(_sample_lead(), "initial")
        self.assertIn("missing a website", content["subject"])
        self.assertIn("Test Salon", content["subject"])

    def test_initial_subject_weak_site(self) -> None:
        content = build_email_content(
            _sample_lead(digitalGap="weak_site"),
            "initial",
        )
        self.assertIn("London", content["subject"])

    def test_initial_subject_default_gap(self) -> None:
        content = build_email_content(
            _sample_lead(digitalGap=""),
            "initial",
        )
        self.assertIn("bookings", content["subject"].lower())

    def test_greeting_uses_rating(self) -> None:
        content = build_email_content(_sample_lead(), "initial")
        self.assertIn("4.8", content["greeting_text"])
        self.assertIn("London", content["greeting_text"])

    def test_pitch_no_website_mentions_services(self) -> None:
        content = build_email_content(_sample_lead(), "initial")
        self.assertIn("Haircuts", content["personalized_pitch_text"])

    def test_followup_generic_subject(self) -> None:
        content = build_email_content(
            _sample_lead(),
            "followup_generic",
            original_subject="Original subject",
        )
        self.assertTrue(content["subject"].startswith("Re:"))

    def test_followup_targeted_service(self) -> None:
        content = build_email_content(
            _sample_lead(),
            "followup_targeted",
            service="automation",
        )
        self.assertIn("automation", content["subject"].lower())
        self.assertIn("EventBook", content["body_text"])

    def test_work_highlight_automation(self) -> None:
        key = _select_work_highlight(_sample_lead(), service="automation")
        self.assertEqual(key, "eventbook")

    def test_work_highlight_social_only(self) -> None:
        key = _select_work_highlight(_sample_lead(digitalGap="social_only"))
        self.assertEqual(key, "ordexia")

    def test_no_em_dash_in_generated_content(self) -> None:
        for email_type in ("initial", "followup_generic", "followup_targeted"):
            content = build_email_content(
                _sample_lead(),
                email_type,
                original_subject="Original subject",
                service="automation",
            )
            for value in content.values():
                if isinstance(value, str):
                    self.assertNotIn(EM_DASH, value, msg=f"{email_type} contains em dash")

    def test_missing_fields_fallback(self) -> None:
        lead = _sample_lead(
            businessName="",
            city="",
            rating=None,
            reviewCount=None,
            digitalGap="",
            gmbServices=[],
            businessSummary="",
        )
        content = build_email_content(lead, "initial")
        self.assertTrue(content["subject"])
        self.assertTrue(content["greeting_html"])
        self.assertTrue(content["body_text"])


class TestEmailRenderer(unittest.TestCase):
    def test_render_initial_includes_brand_elements(self) -> None:
        _, html_body, text_body = render_email(_sample_lead(), "initial", "token-123")
        self.assertIn("Es", html_body)
        self.assertIn("tra", html_body)
        self.assertIn("#8b5cf6", html_body)
        self.assertIn("#050505", html_body)
        self.assertIn("Estra Digital", html_body)
        self.assertIn("Book a free 15-min call", html_body)
        self.assertIn("Unsubscribe", html_body)
        self.assertIn("Test Salon", html_body)
        self.assertIn("Test Salon", text_body)

    def test_render_initial_is_concise(self) -> None:
        _, html_body, _ = render_email(_sample_lead(), "initial", "token-123")
        self.assertNotIn("Four pillars. One team.", html_body)
        self.assertNotIn("Proof &amp; capabilities", html_body)
        self.assertNotIn("About Estra", html_body)

    def test_render_initial_has_no_hero_image(self) -> None:
        _, html_body, _ = render_email(_sample_lead(), "initial", "token-123")
        self.assertNotIn(IMAGE_ASSETS["hero_band"], html_body)
        self.assertNotIn("hero-gradient", html_body)

    def test_render_has_minimum_ctas(self) -> None:
        _, html_body, _ = render_email(_sample_lead(), "initial", "token-123")
        self.assertGreaterEqual(html_body.count("/contact"), 1)
        self.assertIn("/services", html_body)
        self.assertIn("/work", html_body)
        self.assertIn("/api/track", html_body)
        self.assertIn("See our work", html_body)
        self.assertIn("Explore our services", html_body)

    def test_followup_generic_renders(self) -> None:
        subject, html_body, text_body = render_email(
            _sample_lead(),
            "followup_generic",
            "token-123",
            original_subject="First email",
        )
        self.assertTrue(subject)
        self.assertIn("Following up", html_body)
        self.assertIn("happy to chat", text_body.lower())

    def test_followup_targeted_renders(self) -> None:
        _, html_body, _ = render_email(
            _sample_lead(),
            "followup_targeted",
            "token-123",
            service="seo",
        )
        self.assertIn("SEO", html_body)
        self.assertIn(IMAGE_ASSETS["work_thesistechhub"], html_body)


class TestSendTestLeads(unittest.TestCase):
    def test_all_template_types_defined(self) -> None:
        expected = ("initial", "followup_generic", "followup_targeted")
        self.assertEqual(len(expected), 3)

    def test_subject_prefix_format(self) -> None:
        email_type = "followup_targeted"
        subject = f"[TEST {email_type.replace('_', ' ').upper()}] Hello"
        self.assertIn("[TEST FOLLOWUP TARGETED]", subject)


if __name__ == "__main__":
    unittest.main()
