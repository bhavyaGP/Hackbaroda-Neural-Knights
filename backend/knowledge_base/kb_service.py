"""
Knowledge base seeding. Articles are stored in Hindsight's cia_knowledge_base bank.
"""
from memory.hindsight_memory import retain_kb_article

KB_ARTICLES = [
    {
        "title": "Refund Policy",
        "category": "policy",
        "content": """Our refund policy:
- Full refund within 30 days of purchase if the product is unused or defective.
- 50% refund between 30-60 days with manager approval.
- After 60 days: store credit only, no cash refund.
- Subscription cancellations: prorated refund for remaining billing period.
- Digital products: no refund after download unless product is defective.
- Enterprise customers: custom refund terms per contract.
Refunds process within 5-7 business days to original payment method.""",
    },
    {
        "title": "Subscription Plans and Pricing",
        "category": "pricing",
        "content": """Available subscription plans:
- Standard: $29/month — 5 users, 10GB storage, email support, basic features.
- Premium: $99/month — 25 users, 100GB storage, priority support, advanced analytics, API access.
- Enterprise: Custom pricing — Unlimited users, dedicated infrastructure, 24/7 phone support, SLA guarantee, custom integrations.
Annual plans get 20% discount. Free 14-day trial available for all plans.
Upgrade/downgrade available anytime; billing prorated.""",
    },
    {
        "title": "Technical Troubleshooting — Login Issues",
        "category": "technical",
        "content": """Common login issues and fixes:
1. Forgot password: Use 'Forgot Password' on login page. Check spam folder for reset email.
2. Account locked: After 5 failed attempts, account locks for 30 minutes or contact support.
3. SSO issues: Clear browser cache, ensure corporate email domain is whitelisted.
4. 2FA problems: Use backup codes from Settings > Security. Contact support to reset 2FA.
5. Browser compatibility: Supported browsers are Chrome 90+, Firefox 88+, Safari 14+, Edge 90+.
If issue persists after these steps, we create a priority ticket for the technical team.""",
    },
    {
        "title": "Technical Troubleshooting — Performance Issues",
        "category": "technical",
        "content": """Slow performance or timeouts:
1. Check system status at status.ourplatform.com for ongoing incidents.
2. Clear browser cache and cookies.
3. Disable browser extensions that may interfere.
4. For large data exports: use scheduled exports during off-peak hours (2AM-6AM local time).
5. API rate limits: Standard plan 100 req/min, Premium 500 req/min, Enterprise 2000 req/min.
6. Data sync delays: Up to 15 minutes for large datasets.
Contact support with error screenshots and browser console logs for faster diagnosis.""",
    },
    {
        "title": "Data and Privacy",
        "category": "policy",
        "content": """Data handling and privacy:
- GDPR and CCPA compliant.
- Data stored in ISO 27001 certified data centers.
- Customer data never sold to third parties.
- Data retention: Active accounts — indefinite. Cancelled accounts — 90 days, then deleted.
- Data export: Full export available in Settings > Data > Export. Formats: CSV, JSON, Excel.
- Data deletion request: Submitted via Settings > Privacy > Delete Account. Processed within 30 days.
- Breach notification: Within 72 hours per GDPR requirements.""",
    },
    {
        "title": "Billing and Payment",
        "category": "billing",
        "content": """Billing information:
- Billing cycle: Monthly (1st of each month) or Annual (on signup anniversary).
- Payment methods: Visa, Mastercard, Amex, PayPal, Wire transfer (Enterprise).
- Failed payment: 3 retry attempts over 7 days, then account suspended (data preserved for 30 days).
- Invoice: Available in Settings > Billing > Invoices. Auto-emailed on each billing date.
- Tax: VAT/GST applied based on billing country. Tax-exempt status available with valid certificate.
- Upgrade billing: Prorated charge immediately. Downgrade: credited on next invoice.""",
    },
    {
        "title": "Enterprise Support and SLA",
        "category": "enterprise",
        "content": """Enterprise support commitments:
- Response time SLA: P1 (system down) 1 hour, P2 (critical feature) 4 hours, P3 (general) 24 hours.
- Dedicated Customer Success Manager for accounts >$10k/year.
- Quarterly business reviews included.
- Custom onboarding and training sessions.
- 99.9% uptime SLA with financial penalties for breaches.
- White-glove data migration assistance.
- Custom feature development roadmap consideration.""",
    },
    {
        "title": "Account Management",
        "category": "account",
        "content": """Account management features:
- Add/remove users: Settings > Team > Manage Users. Billing adjusts on next cycle.
- Role management: Admin, Manager, Member, Viewer roles available.
- Transfer account ownership: Settings > Account > Transfer Ownership.
- Merge accounts: Contact enterprise team for account consolidation.
- API key management: Settings > Developer > API Keys.
- Audit logs: Admin users can view full audit trail in Settings > Security > Audit Log.""",
    },
    {
        "title": "Cancellation Process",
        "category": "policy",
        "content": """Cancellation and retention options:
- Cancel anytime from Settings > Subscription > Cancel.
- Before cancellation, we offer: 1-month free extension, plan downgrade, pause option (up to 3 months).
- Data after cancellation: Accessible for 30 days in read-only mode, then deleted.
- Reactivation: Within 30 days — full data restored. After 30 days — fresh start.
- Enterprise: 60-day notice required per contract.
- We always try to understand reason for cancellation and offer appropriate resolution.""",
    },
    {
        "title": "Feature Requests and Roadmap",
        "category": "product",
        "content": """Product roadmap and feature requests:
- Submit feature requests at feedback.ourplatform.com.
- Upvote existing requests to prioritize.
- Roadmap shared quarterly with Premium and Enterprise customers.
- Beta program: Opt-in from Settings > Beta Features.
- Custom development: Available for Enterprise customers. Minimum 6-month engagement.
- Integration requests: Check existing 200+ integrations in our marketplace first.""",
    },
]


async def seed_knowledge_base():
    print("[KB] Seeding knowledge base into Hindsight...")
    for article in KB_ARTICLES:
        await retain_kb_article(
            title=article["title"],
            content=article["content"],
            category=article["category"],
        )
    print(f"[KB] Seeded {len(KB_ARTICLES)} articles.")
