/**
 * Shared email layout & design tokens for all UPSC Connect transactional emails.
 *
 * This module is purely presentational. It does NOT change:
 *   - email triggers, delivery routes, queue logic, or timing
 *   - template names, subjects, props, or registry entries
 *
 * Templates wrap their content in <EmailLayout> and use the exported style
 * tokens / reusable section components for a consistent brand look.
 */
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Button, Link,
} from 'npm:@react-email/components@0.0.22'

export const SITE_NAME = 'UPSC Connect'
export const SUPPORT_EMAIL = 'admin@upscconnect.in'
export const SITE_URL = 'https://upscconnect.in'

/* ============================================================
 * Brand tokens
 * ============================================================ */
export const brand = {
  navy: '#1a3a7a',
  navyDark: '#142e60',
  accentGreen: '#16a34a',
  accentAmber: '#d97706',
  accentPurple: '#7c3aed',
  bg: '#f4f6fb',          // page background (subtle, prints as white in clients that drop bg)
  surface: '#ffffff',      // email card background (always white per email-safe guidance)
  border: '#e5e7eb',
  textBody: '#374151',     // muted dark gray (not pure black)
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  textStrong: '#111827',
  tintBlue: '#f0f7ff',
  tintGreen: '#f0fdf4',
  tintAmber: '#fffbeb',
  tintPurple: '#faf5ff',
  tintGray: '#f9fafb',
} as const

const FONT_STACK = "'DM Sans', 'Inter', Arial, Helvetica, sans-serif"

/* ============================================================
 * Reusable style tokens (for use inside template bodies)
 * ============================================================ */
export const text = {
  fontSize: '15px',
  color: brand.textBody,
  lineHeight: '1.65',
  margin: '0 0 16px',
} as const

export const textBold = {
  ...text,
  fontWeight: '600' as const,
  margin: '0 0 12px',
}

export const heading2 = {
  fontSize: '18px',
  fontWeight: '700' as const,
  color: brand.textStrong,
  lineHeight: '1.4',
  margin: '0 0 12px',
} as const

export const signature = {
  fontSize: '14px',
  color: brand.textBody,
  fontWeight: '600' as const,
  margin: '24px 0 0',
} as const

export const reinforcement = {
  fontSize: '13px',
  color: brand.textMuted,
  lineHeight: '1.5',
  margin: '0 0 16px',
  fontStyle: 'italic' as const,
} as const

export const detailLabel = {
  fontSize: '12px',
  fontWeight: '700' as const,
  color: brand.navy,
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.6px',
} as const

export const detailItem = {
  fontSize: '14px',
  color: brand.textBody,
  margin: '0 0 6px',
  lineHeight: '1.5',
} as const

export const detailKey = {
  fontSize: '12px',
  fontWeight: '600' as const,
  color: brand.textMuted,
  margin: '0 0 2px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
} as const

export const detailValue = {
  fontSize: '14px',
  color: brand.textStrong,
  margin: '0 0 14px',
  lineHeight: '1.5',
} as const

export const checklistItem = {
  fontSize: '14px',
  color: brand.textBody,
  margin: '0 0 8px',
  paddingLeft: '8px',
  lineHeight: '1.5',
} as const

export const hr = {
  borderColor: brand.border,
  borderTop: `1px solid ${brand.border}`,
  margin: '24px 0',
} as const

/* ============================================================
 * Reusable section components
 * ============================================================ */
type BoxTone = 'blue' | 'green' | 'amber' | 'purple' | 'gray'

const boxStyles: Record<BoxTone, { bg: string; border: string; label: string }> = {
  blue:   { bg: brand.tintBlue,   border: brand.navy,         label: brand.navy },
  green:  { bg: brand.tintGreen,  border: brand.accentGreen,  label: brand.accentGreen },
  amber:  { bg: brand.tintAmber,  border: brand.accentAmber,  label: brand.accentAmber },
  purple: { bg: brand.tintPurple, border: brand.accentPurple, label: '#6b21a8' },
  gray:   { bg: brand.tintGray,   border: '#d1d5db',          label: brand.textMuted },
}

export const InfoBox = ({
  tone = 'blue',
  label,
  children,
}: {
  tone?: BoxTone
  label?: string
  children: React.ReactNode
}) => {
  const t = boxStyles[tone]
  return (
    <Section
      style={{
        backgroundColor: t.bg,
        borderRadius: '8px',
        padding: '18px 22px',
        margin: '0 0 20px',
        borderLeft: `4px solid ${t.border}`,
      }}
    >
      {label && (
        <Text style={{ ...detailLabel, color: t.label }}>{label}</Text>
      )}
      {children}
    </Section>
  )
}

export const CtaButton = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
    <Button
      href={href}
      style={{
        backgroundColor: brand.navy,
        color: '#ffffff',
        fontSize: '15px',
        fontWeight: '600' as const,
        padding: '13px 32px',
        borderRadius: '8px',
        textDecoration: 'none',
        display: 'inline-block',
      }}
    >
      {children}
    </Button>
  </Section>
)

/* ============================================================
 * EmailLayout — wraps the whole message
 * ============================================================ */
export interface EmailLayoutProps {
  preview: string
  /** Optional eyebrow line shown above the title (e.g. "Booking Confirmed") */
  eyebrow?: string
  /** Optional large title displayed under the header */
  title?: string
  /** Hide the standard footer (rare — e.g. for system admin alerts). Defaults false. */
  hideFooter?: boolean
  children: React.ReactNode
}

export const EmailLayout = ({
  preview,
  eyebrow,
  title,
  hideFooter = false,
  children,
}: EmailLayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={bodyStyle}>
      <Container style={outerContainer}>
        {/* Header */}
        <Section style={headerSection}>
          <Heading as="h1" style={brandWordmark}>
            <span style={brandUC}>UC</span>
            <span style={brandName}>{SITE_NAME}</span>
          </Heading>
          <Text style={tagline}>Mentorship for UPSC Aspirants</Text>
        </Section>
        <Hr style={headerDivider} />

        {/* Body */}
        <Container style={innerContainer}>
          {eyebrow && <Text style={eyebrowStyle}>{eyebrow}</Text>}
          {title && <Heading as="h2" style={titleStyle}>{title}</Heading>}
          {children}
        </Container>

        {/* Footer */}
        {!hideFooter && (
          <>
            <Hr style={footerDivider} />
            <Section style={footerSection}>
              <Text style={footerBrand}>{SITE_NAME}</Text>
              <Text style={footerText}>
                For any queries, contact:{' '}
                <Link href={`mailto:${SUPPORT_EMAIL}`} style={footerLink}>
                  {SUPPORT_EMAIL}
                </Link>
              </Text>
              <Text style={footerSmall}>
                © {new Date().getFullYear()} {SITE_NAME} ·{' '}
                <Link href={SITE_URL} style={footerLink}>upscconnect.in</Link>
              </Text>
              <Text style={footerSmall}>
                You are receiving this email because you have an account on {SITE_NAME}.
              </Text>
            </Section>
          </>
        )}
      </Container>
    </Body>
  </Html>
)

/* ============================================================
 * Layout-internal styles
 * ============================================================ */
const bodyStyle = {
  backgroundColor: brand.bg,
  fontFamily: FONT_STACK,
  margin: 0,
  padding: '24px 0',
  WebkitFontSmoothing: 'antialiased' as const,
}

const outerContainer = {
  maxWidth: '600px',
  width: '100%',
  margin: '0 auto',
  backgroundColor: brand.surface,
  borderRadius: '12px',
  overflow: 'hidden' as const,
  border: `1px solid ${brand.border}`,
}

const headerSection = {
  padding: '28px 32px 20px',
  textAlign: 'center' as const,
}

const brandWordmark = {
  margin: '0',
  fontSize: '22px',
  fontWeight: '700' as const,
  color: brand.navy,
  lineHeight: '1.2',
  display: 'inline-block' as const,
}

const brandUC = {
  display: 'inline-block' as const,
  backgroundColor: brand.navy,
  color: '#ffffff',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '14px',
  fontWeight: '700' as const,
  letterSpacing: '0.5px',
  marginRight: '10px',
  verticalAlign: 'middle' as const,
}

const brandName = {
  verticalAlign: 'middle' as const,
  fontSize: '20px',
  fontWeight: '700' as const,
  color: brand.navy,
  letterSpacing: '0.2px',
}

const tagline = {
  fontSize: '12px',
  color: brand.textMuted,
  margin: '8px 0 0',
  letterSpacing: '0.4px',
  textTransform: 'uppercase' as const,
}

const headerDivider = {
  borderColor: brand.border,
  borderTop: `1px solid ${brand.border}`,
  margin: '0',
}

const innerContainer = {
  padding: '28px 32px 8px',
}

const eyebrowStyle = {
  fontSize: '12px',
  fontWeight: '700' as const,
  color: brand.navy,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.8px',
  margin: '0 0 8px',
}

const titleStyle = {
  fontSize: '22px',
  fontWeight: '700' as const,
  color: brand.textStrong,
  lineHeight: '1.3',
  margin: '0 0 20px',
}

const footerDivider = {
  borderColor: brand.border,
  borderTop: `1px solid ${brand.border}`,
  margin: '8px 0 0',
}

const footerSection = {
  padding: '20px 32px 28px',
  textAlign: 'center' as const,
}

const footerBrand = {
  fontSize: '13px',
  fontWeight: '700' as const,
  color: brand.navy,
  margin: '0 0 6px',
  letterSpacing: '0.3px',
}

const footerText = {
  fontSize: '12px',
  color: brand.textMuted,
  margin: '0 0 8px',
  lineHeight: '1.5',
}

const footerSmall = {
  fontSize: '11px',
  color: brand.textFaint,
  margin: '0 0 4px',
  lineHeight: '1.5',
}

const footerLink = {
  color: brand.navy,
  textDecoration: 'underline' as const,
}
