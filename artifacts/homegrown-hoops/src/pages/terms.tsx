const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function TermsPage() {
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
          <h1 style={h1Style}>Terms of Service</h1>
          <p style={metaStyle}>Homegrown Hoops · Pilot Season 2026</p>
        </div>

        <Section title="What Homegrown Hoops Is">
          <p style={bodyStyle}>
            Homegrown Hoops is a youth basketball platform that tracks player stats, displays achievements and stores game footage. It is currently operating as a free pilot season.
          </p>
        </Section>

        <Section title="Who Can Use It">
          <p style={bodyStyle}>
            Players must be registered members of a participating team. Players under 18 require a parent or guardian to consent on their behalf at signup.
          </p>
        </Section>

        <Section title="Your Content">
          <p style={bodyStyle}>
            By uploading or allowing upload of video footage you grant Homegrown Hoops permission to store and display that footage on the platform. You retain ownership of your content. You can request removal at any time by contacting us.
          </p>
        </Section>

        <Section title="Your Data">
          <p style={bodyStyle}>
            We collect your name, email, school, position, graduation year, jersey number, profile photo and basketball statistics. This information is used only to operate your player profile. We do not sell your data to anyone.
          </p>
        </Section>

        <Section title="Stats and Achievements">
          <p style={bodyStyle}>
            Your stats, Stamps, Tides, Archetype and Legacy Score are displayed on your public player profile. Other registered users can view your profile.
          </p>
        </Section>

        <Section title="Pilot Season">
          <p style={bodyStyle}>
            This is a free pilot season. Features may change. The platform is being actively developed. We appreciate your patience and feedback.
          </p>
        </Section>

        <div id="video-consent" style={{ scrollMarginTop: 80 }}>
          <Section title="Video and Image Consent">
            <p style={bodyStyle}>
              By creating a player profile on Homegrown Hoops you consent to the following:
            </p>
            <ul style={listStyle}>
              <li style={listItemStyle}>Your profile photo, name, school, position, stats and achievements are visible to all registered users of the platform.</li>
              <li style={listItemStyle}>Game footage that you or your team uploads may be stored on the platform and viewable by registered users.</li>
              <li style={listItemStyle}>If you are under 18, a parent or guardian must provide this consent on your behalf at signup.</li>
              <li style={listItemStyle}>You may request removal of any footage or image containing you at any time by contacting the platform administrator. Removal will be completed within 48 hours.</li>
              <li style={listItemStyle}>You retain ownership of any content you upload. Homegrown Hoops does not sell, license or transfer your images or footage to third parties.</li>
            </ul>
          </Section>
        </div>

        <Section title="Contact">
          <p style={bodyStyle}>
            Questions or concerns can be directed to the platform administrator.
          </p>
        </Section>

        <div style={footerLinkBar}>
          <a href={`${basePath}/privacy`} style={footerLink}>Privacy Policy →</a>
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

const listStyle: React.CSSProperties = {
  margin: "12px 0 0",
  paddingLeft: 20,
};

const listItemStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: "hsl(215, 16%, 72%)",
  marginBottom: 8,
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
