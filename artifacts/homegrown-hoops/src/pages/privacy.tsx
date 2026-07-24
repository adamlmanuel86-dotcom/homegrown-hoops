const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function PrivacyPage() {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ marginBottom: 32 }}>
          <a
            href={`${basePath}/sign-up`}
            style={backLinkStyle}
            onClick={(e) => {
              if (window.history.length > 1) {
                e.preventDefault();
                window.history.back();
              }
            }}
          >
            ← Back
          </a>
        </div>

        <div style={headerStyle}>
          <div style={pillStyle}>Legal</div>
          <h1 style={h1Style}>Privacy Policy</h1>
          <p style={metaStyle}>Court Presence · Pilot Season 2026</p>
        </div>

        <Section title="What We Collect">
          <p style={bodyStyle}>
            Name, email address, school, graduation year, position, jersey number, profile photo, basketball statistics, game footage you or your team uploads.
          </p>
        </Section>

        <Section title="How We Use It">
          <p style={bodyStyle}>
            To create and display your player profile, calculate your stats and achievements, and operate the platform. Nothing else.
          </p>
        </Section>

        <Section title="Who Can See It">
          <p style={bodyStyle}>
            Your player profile including name, school, stats, Stamps, Tides and Archetype is visible to all registered users of the platform. Your email address is never visible to other users.
          </p>
        </Section>

        <Section title="Game Footage">
          <p style={bodyStyle}>
            Game footage uploaded to the platform is viewable by registered users. If you want footage removed contact the administrator and it will be deleted within 48 hours.
          </p>
        </Section>

        <Section title="Your Rights Under Canadian Law">
          <p style={bodyStyle}>
            Under PIPEDA you have the right to access your personal information, correct inaccurate information and request deletion of your data. To exercise these rights contact the administrator.
          </p>
        </Section>

        <Section title="Data Storage">
          <p style={bodyStyle}>
            Your data is stored securely on third party servers including Replit and Cloudinary. We take reasonable steps to protect your information.
          </p>
        </Section>

        <Section title="Contact">
          <p style={bodyStyle}>
            Questions about privacy can be directed to the platform administrator.
          </p>
        </Section>

        <div style={footerLinkBar}>
          <a href={`${basePath}/terms`} style={footerLink}>Terms of Service →</a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={sectionStyle}>
      <h2 style={h2Style}>{title}</h2>
      {children}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100dvh",
  background: "hsl(222, 42%, 7%)",
  color: "hsl(210, 16%, 88%)",
  padding: "48px 20px 80px",
  boxSizing: "border-box",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 680,
  margin: "0 auto",
};

const backLinkStyle: React.CSSProperties = {
  color: "hsl(22, 78%, 52%)",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
};

const headerStyle: React.CSSProperties = {
  marginBottom: 48,
  paddingBottom: 32,
  borderBottom: "1px solid hsl(220, 28%, 17%)",
};

const pillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 12px",
  borderRadius: 20,
  background: "hsla(22, 78%, 46%, 0.15)",
  border: "1px solid hsla(22, 78%, 46%, 0.3)",
  color: "hsl(22, 78%, 62%)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 16,
};

const h1Style: React.CSSProperties = {
  fontFamily: "'Anton', sans-serif",
  fontSize: "clamp(36px, 8vw, 52px)",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  color: "hsl(210, 16%, 96%)",
  margin: "0 0 8px",
};

const metaStyle: React.CSSProperties = {
  fontSize: 13,
  color: "hsl(215, 16%, 52%)",
  margin: 0,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 36,
  paddingBottom: 36,
  borderBottom: "1px solid hsl(220, 28%, 14%)",
};

const h2Style: React.CSSProperties = {
  fontFamily: "'Anton', sans-serif",
  fontSize: 18,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "hsl(22, 78%, 60%)",
  margin: "0 0 12px",
};

const bodyStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: "hsl(215, 16%, 72%)",
  margin: 0,
};

const footerLinkBar: React.CSSProperties = {
  paddingTop: 24,
  display: "flex",
  gap: 20,
};

const footerLink: React.CSSProperties = {
  color: "hsl(22, 78%, 52%)",
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
};
