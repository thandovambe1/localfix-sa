export type ContentBlock =
  | { type: "prose"; heading?: string; body: string[] }
  | { type: "cards"; heading: string; items: { icon?: string; title: string; body: string }[] }
  | { type: "faq"; heading: string; items: { q: string; a: string }[] }
  | { type: "pricing"; heading: string; tiers: { name: string; price: string; note: string; features: string[]; featured?: boolean }[] }
  | { type: "contact"; heading: string }
  | { type: "posts"; heading: string; items: { title: string; excerpt: string; tag: string; read: string }[] };

export type ContentPage = {
  slug: string;
  title: string;
  eyebrow: string;
  heading: string;
  intro: string;
  blocks: ContentBlock[];
};

export const CONTENT_PAGES: ContentPage[] = [
  {
    slug: "about",
    title: "About LocalFix SA",
    eyebrow: "About",
    heading: "Home services, dispatched in real time",
    intro:
      "LocalFix SA is a South African technology company rebuilding how homes get fixed. We replace WhatsApp groups, outdated directories and unanswered phone calls with instant, verified dispatch.",
    blocks: [
      {
        type: "prose",
        heading: "Why we exist",
        body: [
          "Ask any South African homeowner about their last emergency repair and you'll hear the same story: three unanswered calls, one no-show and a price plucked from thin air. Meanwhile thousands of skilled, honest small businesses struggle to find consistent work.",
          "LocalFix SA closes that gap. Customers post a job in under three minutes. Our matching engine instantly broadcasts it to verified professionals in range who actually do that trade. Quotes come back, side by side, with ratings, warranties and availability attached.",
          "Leads are free for providers. Verification is compulsory. Reviews are only from real, completed jobs.",
        ],
      },
      {
        type: "cards",
        heading: "What we stand for",
        items: [
          { icon: "🤝", title: "Trust by default", body: "Documents verified before a provider ever receives a lead." },
          { icon: "⚡", title: "Speed matters", body: "Emergency jobs reach available pros within seconds, not days." },
          { icon: "🇿🇦", title: "Local first", body: "Built for South African suburbs, load shedding, POPIA and payment rails." },
          { icon: "📈", title: "Small business growth", body: "Free qualified leads, real analytics and tools that win more work." },
        ],
      },
      {
        type: "prose",
        heading: "Where we're going",
        body: [
          "We launch in Gauteng, the Western Cape and KwaZulu-Natal, expanding nationally and then into the rest of Africa. Next up: architects, inspections, insurance claims, EV charger installers, smart home specialists, maintenance plans and native iOS and Android apps.",
        ],
      },
    ],
  },
  {
    slug: "pricing",
    title: "Pricing",
    eyebrow: "Pricing",
    heading: "Free for homeowners. Free to start for providers.",
    intro:
      "No commission on your first jobs, no lock-in contracts, no lead-buying auctions. Upgrade only when LocalFix is making you money.",
    blocks: [
      {
        type: "pricing",
        heading: "Provider plans",
        tiers: [
          {
            name: "Starter",
            price: "R0",
            note: "per month, forever",
            features: [
              "Verified business profile",
              "Up to 10 job leads a month",
              "Quote and chat in-platform",
              "Reviews and rating profile",
              "Standard support",
            ],
          },
          {
            name: "Pro",
            price: "R399",
            note: "per month, cancel anytime",
            featured: true,
            features: [
              "Unlimited job leads",
              "Priority placement in matching",
              "Business analytics dashboard",
              "Invoices, quotes and calendar",
              "Portfolio and before/after gallery",
              "Priority support",
            ],
          },
          {
            name: "Premium",
            price: "R899",
            note: "per month, cancel anytime",
            features: [
              "Everything in Pro",
              "Premium Provider badge",
              "Featured placement on category pages",
              "Multi-branch and team accounts",
              "Dedicated account manager",
              "API access for job sync",
            ],
          },
        ],
      },
      {
        type: "cards",
        heading: "For customers",
        items: [
          { icon: "🆓", title: "Always free", body: "Post unlimited jobs, receive unlimited quotes, pay nothing to LocalFix." },
          { icon: "💳", title: "Secure payment", body: "Pay your provider by card, instant EFT or wallet — deposits and milestones supported." },
          { icon: "🧾", title: "Real invoices", body: "Downloadable VAT invoices and receipts for every job." },
        ],
      },
    ],
  },
  {
    slug: "trust-safety",
    title: "Trust & Safety",
    eyebrow: "Trust & Safety",
    heading: "Verification is the product",
    intro:
      "Anyone can list a phone number on a directory. On LocalFix SA, a professional cannot receive a single lead until our checks are complete.",
    blocks: [
      {
        type: "cards",
        heading: "Our verification stack",
        items: [
          { icon: "🪪", title: "Identity Verified", body: "SA ID or passport matched to the business owner." },
          { icon: "🏛️", title: "Business Registered", body: "CIPC registration number and tax reference validated." },
          { icon: "🛡️", title: "Insurance Verified", body: "Public liability policy checked and expiry-tracked." },
          { icon: "📜", title: "Trade Qualified", body: "Trade certificates, wireman's licence, PIRB, PSIRA, SARACCA and more." },
          { icon: "👮", title: "Police Clearance", body: "Optional but strongly recommended — displayed on the profile." },
          { icon: "✅", title: "Background Checked", body: "Address, references and platform performance history." },
        ],
      },
      {
        type: "cards",
        heading: "Protection on every job",
        items: [
          { icon: "🔒", title: "Secure payments", body: "Funds move through recognised SA gateways. Escrow is on the roadmap." },
          { icon: "💬", title: "On-platform records", body: "Chat, photos, quotes and agreements are logged and encrypted." },
          { icon: "🚩", title: "Report a provider", body: "One tap reporting with a 24-hour response SLA on serious reports." },
          { icon: "⚖️", title: "Dispute resolution", body: "Our resolution team mediates and can suspend accounts and refund deposits." },
          { icon: "☎️", title: "Emergency hotline", body: "0800 LOCALFIX for urgent safety issues, 24/7." },
          { icon: "🔍", title: "Fraud detection", body: "AI flags duplicate listings, suspicious pricing and off-platform payment requests." },
        ],
      },
      {
        type: "prose",
        heading: "Security & compliance",
        body: [
          "SSL everywhere, encrypted data at rest, two-factor authentication, role-based access control, audit logs, daily backups and CAPTCHA-protected forms. Our data practices are POPIA compliant and structured to satisfy GDPR-style requirements for future expansion.",
        ],
      },
    ],
  },
  {
    slug: "help",
    title: "Help Centre",
    eyebrow: "Support",
    heading: "How can we help?",
    intro: "Guides for homeowners and service providers, plus a human support team when you need one.",
    blocks: [
      {
        type: "cards",
        heading: "Popular guides",
        items: [
          { icon: "📝", title: "Posting a great job request", body: "Photos, urgency and a clear description get you better quotes, faster." },
          { icon: "⚖️", title: "Comparing quotes properly", body: "What to check beyond price: warranty, materials, compliance certificates." },
          { icon: "💳", title: "Paying safely", body: "Never pay off-platform. Use deposits and milestones for larger projects." },
          { icon: "🧰", title: "Getting verified as a provider", body: "The exact document list and how long each check takes." },
          { icon: "⭐", title: "Ratings and reviews", body: "How ratings are calculated and how to respond to feedback." },
          { icon: "🔐", title: "Account security", body: "Set up two-factor authentication and manage devices." },
        ],
      },
      { type: "contact", heading: "Still stuck? Talk to a human" },
    ],
  },
  {
    slug: "faqs",
    title: "FAQs",
    eyebrow: "FAQs",
    heading: "Frequently asked questions",
    intro: "Everything homeowners and providers ask us before their first job.",
    blocks: [
      {
        type: "faq",
        heading: "For homeowners",
        items: [
          { q: "Is LocalFix SA free to use?", a: "Yes. Posting jobs, receiving quotes, chatting and comparing providers is completely free for customers. You only pay the professional for the work." },
          { q: "How fast will I get quotes?", a: "Most jobs receive their first quote within 18 minutes. Emergency jobs are pushed to 24/7 providers within seconds." },
          { q: "How are providers verified?", a: "We check identity documents, CIPC business registration, tax details, insurance, trade qualifications and, where provided, police clearance before activation." },
          { q: "Is my address shared with everyone?", a: "No. Providers only see the suburb and city until you accept a quote. Your exact address and contact details are then shared with that provider only." },
          { q: "What if something goes wrong?", a: "Report the job in one tap. Our dispute resolution team mediates, and we can suspend accounts and assist with refunds of on-platform payments." },
        ],
      },
      {
        type: "faq",
        heading: "For service providers",
        items: [
          { q: "How much does it cost to join?", a: "Registration and verification are free, and the Starter plan gives you up to 10 leads a month at no cost. Pro is R399 per month for unlimited leads." },
          { q: "How do I receive job requests?", a: "Jobs matching your trades and service radius are pushed to your dashboard instantly, with email, SMS and WhatsApp notifications." },
          { q: "Do I pay per lead?", a: "No. LocalFix does not sell leads or run bidding auctions. You see the job, you quote, the customer chooses." },
          { q: "How long does verification take?", a: "Most providers are activated within 24 to 48 hours once all documents are uploaded." },
          { q: "Can I work in multiple provinces?", a: "Yes. Select every province and city you operate in, and set a service radius per branch." },
        ],
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact Us",
    eyebrow: "Contact",
    heading: "We'd love to hear from you",
    intro: "Support, partnerships, media or feedback — we answer every message within one business day.",
    blocks: [
      { type: "contact", heading: "Send us a message" },
      {
        type: "cards",
        heading: "Other ways to reach us",
        items: [
          { icon: "☎️", title: "Emergency hotline", body: "0800 LOCALFIX (0800 562 253) — 24 hours, every day." },
          { icon: "✉️", title: "Email", body: "hello@localfix.co.za · support@localfix.co.za" },
          { icon: "🏢", title: "Head office", body: "The Campus, Bryanston, Johannesburg, 2191" },
        ],
      },
    ],
  },
  {
    slug: "blog",
    title: "Blog",
    eyebrow: "Blog",
    heading: "Home maintenance, decoded",
    intro: "Practical, South African advice on maintaining, protecting and improving your property.",
    blocks: [
      {
        type: "posts",
        heading: "Latest articles",
        items: [
          { title: "What a geyser replacement should actually cost in 2026", excerpt: "Element, thermostat, drip tray, CoC — a full breakdown of fair pricing across the major metros.", tag: "Plumbing", read: "6 min" },
          { title: "Solar in South Africa: hybrid vs off-grid explained", excerpt: "Which system suits your load profile, what SSEG registration involves and how to compare installer quotes.", tag: "Solar", read: "9 min" },
          { title: "The pre-winter home maintenance checklist", excerpt: "Gutters, waterproofing, geyser blankets and eleven other jobs to do before the first cold front.", tag: "Maintenance", read: "5 min" },
          { title: "How landlords cut maintenance costs by 30%", excerpt: "Preventative plans, trusted provider pools and how to keep tenants happy without overspending.", tag: "Property", read: "7 min" },
          { title: "Spotting a dodgy quote before you pay a deposit", excerpt: "Seven red flags in written quotes, and the questions that expose them fast.", tag: "Trust", read: "4 min" },
          { title: "Load shedding-proofing your home for under R60 000", excerpt: "Inverter sizing, battery chemistry and what you can realistically run.", tag: "Electrical", read: "8 min" },
        ],
      },
    ],
  },
  {
    slug: "careers",
    title: "Careers",
    eyebrow: "Careers",
    heading: "Build the infrastructure of South African homes",
    intro: "We're a small, senior team shipping fast. If you want ownership and real-world impact, talk to us.",
    blocks: [
      {
        type: "cards",
        heading: "Open roles",
        items: [
          { icon: "💻", title: "Senior Full-Stack Engineer", body: "Next.js, TypeScript, PostgreSQL. Johannesburg or remote (SAST)." },
          { icon: "📱", title: "Mobile Engineer (React Native)", body: "Own the launch of our iOS and Android apps." },
          { icon: "🤝", title: "Provider Success Manager", body: "Onboard and grow our network of verified trades." },
          { icon: "🔍", title: "Trust & Safety Analyst", body: "Document verification, fraud detection and disputes." },
          { icon: "📣", title: "Performance Marketer", body: "SEO, paid social and referral loops across SA metros." },
          { icon: "🎨", title: "Product Designer", body: "Mobile-first design systems for two-sided marketplaces." },
        ],
      },
      { type: "contact", heading: "Apply or say hello" },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    eyebrow: "Legal",
    heading: "Privacy Policy",
    intro: "Last updated: February 2026. This policy explains what we collect, why, and the control you have over it.",
    blocks: [
      {
        type: "prose",
        heading: "Information we collect",
        body: [
          "Account information: name, email address, mobile number, and for providers, business registration, tax details, qualifications, insurance and identity documents.",
          "Job information: descriptions, photos, videos, addresses, GPS coordinates, budgets and appointment preferences.",
          "Usage information: device data, IP address, pages viewed and interactions, used to improve matching, security and performance.",
        ],
      },
      {
        type: "prose",
        heading: "How we use it",
        body: [
          "To match your job with suitable, verified professionals nearby; to enable quoting, messaging, payments and invoicing; to detect fraud and abuse; and to send service notifications you have opted into.",
          "We never sell your personal information. Exact addresses and contact details are only released to the provider whose quote you accept.",
        ],
      },
      {
        type: "prose",
        heading: "Your rights",
        body: [
          "You may request access to, correction of, or deletion of your personal information at any time by emailing privacy@localfix.co.za. You may object to direct marketing at any point, and every marketing email includes an unsubscribe link.",
          "Data is encrypted in transit and at rest, retained only as long as necessary, and backed up daily in South African or equivalent-standard data centres.",
        ],
      },
    ],
  },
  {
    slug: "popia",
    title: "POPIA Compliance",
    eyebrow: "Legal",
    heading: "POPIA Compliance",
    intro:
      "LocalFix SA processes personal information in line with the Protection of Personal Information Act, 4 of 2013.",
    blocks: [
      {
        type: "cards",
        heading: "The eight conditions, applied",
        items: [
          { icon: "1️⃣", title: "Accountability", body: "An appointed Information Officer is responsible for compliance and registered with the Regulator." },
          { icon: "2️⃣", title: "Processing limitation", body: "We collect the minimum information needed to dispatch and complete a job, with consent." },
          { icon: "3️⃣", title: "Purpose specification", body: "Each field we collect maps to a stated purpose disclosed at the point of collection." },
          { icon: "4️⃣", title: "Further processing", body: "We do not repurpose your data for unrelated uses without fresh consent." },
          { icon: "5️⃣", title: "Information quality", body: "You can review and correct your details in your dashboard at any time." },
          { icon: "6️⃣", title: "Openness", body: "This page, our privacy policy and in-product notices document all processing." },
          { icon: "7️⃣", title: "Security safeguards", body: "Encryption, 2FA, RBAC, audit logs, penetration testing and breach notification procedures." },
          { icon: "8️⃣", title: "Data subject participation", body: "Access, correction and deletion requests are actioned within 30 days." },
        ],
      },
      {
        type: "prose",
        heading: "Contact our Information Officer",
        body: ["Email popia@localfix.co.za with the subject line 'POPIA request'. We acknowledge all requests within 48 hours."],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    eyebrow: "Legal",
    heading: "Terms & Conditions",
    intro: "Last updated: February 2026. By using LocalFix SA you agree to these terms.",
    blocks: [
      {
        type: "prose",
        heading: "1. The platform",
        body: [
          "LocalFix SA operates a marketplace that connects customers with independent service providers. LocalFix SA is not the supplier of the services and does not employ the providers listed on the platform.",
          "Verification badges reflect documents supplied and checked at a point in time. Customers remain responsible for satisfying themselves as to suitability before accepting a quote.",
        ],
      },
      {
        type: "prose",
        heading: "2. Customers",
        body: [
          "You agree to provide accurate job information, to allow safe access to the property, and to pay accepted quotes according to the agreed terms. Abusive behaviour, off-platform payment circumvention or fraudulent job posting may result in suspension.",
        ],
      },
      {
        type: "prose",
        heading: "3. Service providers",
        body: [
          "You warrant that all documents supplied are genuine and current, that you hold the qualifications, licences and insurance required by South African law, and that you will honour quoted prices, timelines and warranties. Repeated no-shows, poor ratings or verification lapses may result in removal.",
        ],
      },
      {
        type: "prose",
        heading: "4. Payments, liability and disputes",
        body: [
          "On-platform payments are processed by licensed South African payment providers. LocalFix SA's liability is limited to the fees paid to us. Disputes should be raised through the platform, where our resolution team will mediate. These terms are governed by the laws of the Republic of South Africa.",
        ],
      },
    ],
  },
];

export const CONTENT_BY_SLUG = new Map(CONTENT_PAGES.map((p) => [p.slug, p]));
