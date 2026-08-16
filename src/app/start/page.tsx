import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VIA BUSAN - Your Busan Travel Assistant",
  description: "Chat with Via Busan on WhatsApp or LINE for Busan travel info",
};

interface StartPageProps {
  searchParams: Promise<{ utm_source?: string; utm_campaign?: string }>;
}

export default async function StartPage({ searchParams }: StartPageProps) {
  const params = await searchParams;
  const utmSource = params.utm_source ?? "direct";
  const utmCampaign = params.utm_campaign ?? "";

  // TODO[MVP]: Replace with actual bot links after WhatsApp/LINE approval
  const whatsappLink = `https://wa.me/YOUR_PHONE_NUMBER?text=Hi`;
  const lineLink = `https://line.me/R/ti/p/YOUR_LINE_ID`;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>VIA BUSAN</h1>
        <p style={{ fontSize: "1.1rem", marginBottom: "2rem", opacity: 0.9 }}>
          Your Busan Travel Assistant
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "1rem 2rem",
              background: "#25D366",
              color: "white",
              borderRadius: "12px",
              textDecoration: "none",
              fontSize: "1.1rem",
              fontWeight: 600,
            }}
          >
            WhatsApp
          </a>

          <a
            href={lineLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "1rem 2rem",
              background: "#00C300",
              color: "white",
              borderRadius: "12px",
              textDecoration: "none",
              fontSize: "1.1rem",
              fontWeight: 600,
            }}
          >
            LINE
          </a>
        </div>

        <p style={{ marginTop: "2rem", fontSize: "0.85rem", opacity: 0.7 }}>
          No app installation required
        </p>
      </div>

      {/* Hidden tracking data */}
      <input type="hidden" data-utm-source={utmSource} data-utm-campaign={utmCampaign} />
    </main>
  );
}
